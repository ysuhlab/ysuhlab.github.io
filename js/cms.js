(function () {
  "use strict";

  var CMS_CONFIG = {
    dataBase: "data/",
    imgBase: "images/",
    fallbackMember: "img/logo.png",
  };

  function escapeHtml(s) {
    if (s === null || s === undefined) return "";
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function imgUrl(name, base) {
    if (!name) return "";
    name = String(name).trim();
    if (/^https?:\/\//i.test(name)) return name;
    return (base || CMS_CONFIG.imgBase) + name;
  }

  function loadingHtml() {
    return '<p class="cms-loading" style="text-align:center;color:#888;padding:40px 0;">Loading…</p>';
  }

  function errorHtml(msg) {
    return (
      '<p class="cms-error" style="text-align:center;color:#c0392b;padding:40px 0;">' +
      escapeHtml(msg || "데이터를 불러오지 못했습니다.") +
      "</p>"
    );
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function syncWow() {
    if (window.WOW && window.innerWidth > 767) {
      try {
        new window.WOW().init();
      } catch (e) {
        /* WOW 미로드 등 무시 */
      }
    }
  }

  function fetchSheet(name) {
    if (window.CMS_MOCK && window.CMS_MOCK[name]) {
      return Promise.resolve(window.CMS_MOCK[name]);
    }
    var url = CMS_CONFIG.dataBase + name + ".json?t=" + Date.now();
    return fetch(url, { cache: "no-store" })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status + " (" + name + ".json)");
        return res.json();
      })
      .then(function (data) {
        if (data && data.error) throw new Error(data.error);
        if (!Array.isArray(data)) throw new Error("잘못된 데이터 형식");
        return data;
      });
  }

  function loadAndRender(name, containerId, renderFn) {
    var c = byId(containerId);
    if (c) c.innerHTML = loadingHtml();

    fetchSheet(name)
      .then(function (data) {
        renderFn(data);
      })
      .catch(function (err) {
        var c2 = byId(containerId);
        if (c2) c2.innerHTML = errorHtml(err && err.message);
        if (window.console) console.error("[cms] " + name + ":", err);
      });
  }

  function byCategory(rows, key) {
    var out = {};
    rows.forEach(function (r) {
      var k = (r[key] || "").toString().trim().toLowerCase();
      if (!k) return;
      (out[k] = out[k] || []).push(r);
    });
    return out;
  }

  var MEMBER_GROUPS = [
    { key: "advisor", label: "Advisor", roleIcon: "fa-university", affIcon: "fa-building" },
    { key: "master", label: "Master's Students", roleIcon: "fa-graduation-cap", affIcon: "fa-university" },
    { key: "undergraduate", label: "Undergraduate Students", roleIcon: "fa-graduation-cap", affIcon: "fa-university" },
    { key: "alumni", label: "Alumni", roleIcon: "fa-graduation-cap", affIcon: "fa-university" },
  ];

  function memberCard(m, grp) {
    var img = imgUrl(m.image_name, CMS_CONFIG.imgBase) || CMS_CONFIG.fallbackMember;
    var lines = [];
    if (m.role)
      lines.push('<span class="meta"><i class="fa ' + grp.roleIcon + '"></i>' + escapeHtml(m.role) + "</span>");
    if (m.affiliation)
      lines.push('<span class="meta"><i class="fa ' + grp.affIcon + '"></i>' + escapeHtml(m.affiliation) + "</span>");
    if (m.phone)
      lines.push('<span class="meta"><i class="fa fa-phone-square"></i>' + escapeHtml(m.phone) + "</span>");
    if (m.email)
      lines.push('<span class="meta"><i class="fa fa-envelope"></i>' + escapeHtml(m.email) + "</span>");

    var cv = m.cv_url ? escapeHtml(m.cv_url) : "#";
    return (
      '<div class="single-comments">' +
      '<div class="main">' +
      '<div class="head"><img src="' + escapeHtml(img) + '" alt="' + escapeHtml(m.name) + '" /></div>' +
      '<div class="body">' +
      "<h4>" + escapeHtml(m.name) + "</h4>" +
      '<div class="comment-meta">' + lines.join("<br />") + "</div>" +
      '<a href="' + cv + '"><i class="fa fa-reply"></i>CV</a>' +
      "</div></div></div>"
    );
  }

  function renderMembers(rows) {
    var groups = byCategory(rows, "group");
    var html = "";
    MEMBER_GROUPS.forEach(function (grp) {
      var list = groups[grp.key];
      if (!list || !list.length) return;
      html +=
        '<div class="col-12"><div class="blog-comments">' +
        "<h2>" + escapeHtml(grp.label) + "</h2>" +
        '<div class="comments-body">' +
        list
          .map(function (m) {
            return memberCard(m, grp);
          })
          .join("") +
        "</div></div></div>";
    });
    var c = byId("cms-members");
    if (c) c.innerHTML = html || errorHtml("등록된 멤버가 없습니다.");
  }

  var PUB_CATS = [
    { key: "journal", label: "Journal" },
    { key: "conference", label: "Conference" },
  ];

  function renderPubs(rows, scope) {
    // scope: "Domestic" | "International"
    var cats = byCategory(rows, "category");
    var html = "";
    PUB_CATS.forEach(function (cat) {
      var list = cats[cat.key] || [];
      var items;
      if (list.length) {
        items = list
          .map(function (r) {
            return (
              '<li><a class="">' +
              (r.citation || "") +
              "</a></li>"
            );
          })
          .join("");
      } else {
        items = '<li><a class="">None</a></li>';
      }
      html +=
        '<div class="row faq-wrap"><div class="col-lg-12">' +
        '<div class="faq-head"><h2>' + escapeHtml(scope + " " + cat.label) + "</h2></div>" +
        '<div class="faq-item"><ul class="accordion">' + items + "</ul></div>" +
        "</div></div>";
    });
    var c = byId("cms-pubs");
    if (c) {
      c.innerHTML = html; // 애니메이션 제거: 전체 항목을 즉시 노출
    }
  }

  /* ---- Projects (inprepa/ongoing/konju) ---- */
  function renderProjects(rows) {
    var cats = byCategory(rows, "category");

    function numbered(list) {
      return list
        .map(function (r, i) {
          return "<h3>" + (i + 1) + "</h3><p>" + escapeHtml(r.description) + "</p>";
        })
        .join("");
    }
    function plain(list) {
      return list
        .map(function (r) {
          return "<p>" + escapeHtml(r.description) + "</p>";
        })
        .join("");
    }

    var map = {
      "cms-proj-inprepa": { list: cats.inprepa || [], fn: numbered },
      "cms-proj-ongoing": { list: cats.ongoing || [], fn: numbered },
      "cms-proj-konju": { list: cats.konju || [], fn: numbered },
    };
    Object.keys(map).forEach(function (id) {
      var c = byId(id);
      if (!c) return;
      var m = map[id];
      c.innerHTML = m.list.length ? m.fn(m.list) : "<p>None</p>";
    });
  }

  /* ---- Lectures (undergraduate/graduate) ---- */
  var LECTURE_CATS = [
    { key: "undergraduate", label: "Undergraduate" },
    { key: "graduate", label: "Graduate" },
  ];

  function renderLectures(rows) {
    var cats = byCategory(rows, "category");
    var html = "";
    LECTURE_CATS.forEach(function (cat) {
      var list = cats[cat.key];
      if (!list || !list.length) return;
      html +=
        "<h2>" + escapeHtml(cat.label) + "</h2><ul>" +
        list
          .map(function (r) {
            return '<li><i class="icofont-tick-mark"></i> ' + escapeHtml(r.title) + "</li>";
          })
          .join("") +
        "</ul>";
    });
    var c = byId("cms-lectures");
    if (c) c.innerHTML = html || errorHtml("등록된 강의가 없습니다.");
  }

  /* ---- Gallery (event_id 그룹핑) ---- */
  function renderGallery(rows) {
    // event_id 등장 순서대로 그룹핑
    var order = [];
    var groups = {};
    rows.forEach(function (r) {
      var id = (r.event_id || "").toString().trim();
      if (!id) return;
      if (!groups[id]) {
        groups[id] = { meta: r, photos: [] };
        order.push(id);
      }
      if (r.image_name) groups[id].photos.push(r);
    });

    var html = order
      .map(function (id) {
        var g = groups[id];
        var meta = g.meta;
        var photos = g.photos
          .map(function (p) {
            var src = imgUrl(p.image_name, CMS_CONFIG.imgBase);
            var cap = escapeHtml(p.caption);
            return (
              '<div class="col-lg-4 col-md-6 col-6 gallery-item-col">' +
              '<a href="' + escapeHtml(src) + '" class="gallery-item" title="' + cap + '">' +
              '<img src="' + escapeHtml(src) + '" alt="' + cap + '" /></a>' +
              '<div class="gallery-thumb-caption">' + cap + "</div>" +
              "</div>"
            );
          })
          .join("");
        return (
          '<div class="gallery-event">' +
          '<div class="row"><div class="col-lg-12">' +
          '<h3 class="gallery-event-title">' + escapeHtml(meta.event_title) + "</h3>" +
          '<div class="gallery-event-meta">' + escapeHtml(meta.event_meta) + "</div>" +
          '<p class="gallery-event-description">' + escapeHtml(meta.event_description) + "</p>" +
          "</div></div>" +
          '<div class="row gallery-grid">' + photos + "</div>" +
          "</div>"
        );
      })
      .join("");

    var c = byId("cms-gallery");
    if (c) c.innerHTML = html || errorHtml("등록된 갤러리가 없습니다.");
    bindGalleryLightbox();
  }

  // main.js 와 동일한 magnificPopup 옵션으로 동적 삽입분 라이트박스 재바인딩
  function bindGalleryLightbox() {
    if (!window.jQuery || !window.jQuery.fn.magnificPopup) return;
    window.jQuery(".gallery-grid").each(function () {
      window.jQuery(this).magnificPopup({
        delegate: "a.gallery-item",
        type: "image",
        closeOnContentClick: false,
        closeBtnInside: true,
        mainClass: "mfp-with-zoom mfp-img-mobile",
        gallery: {
          enabled: true,
          navigateByImgClick: true,
          preload: [0, 1],
          tCounter: '<span class="mfp-counter">%curr% / %total%</span>',
        },
        zoom: { enabled: true, duration: 300 },
        image: {
          titleSrc: function (item) {
            return item.el.attr("title") || "";
          },
        },
      });
    });
  }

  /* ---- Notice (전체) & Recent News (index top3) ---- */
  function noticeItem(r) {
    var body = "";
    if (r.title) body += "<strong>" + escapeHtml(r.title) + "</strong><br />";
    body += escapeHtml(r.content);
    if (r.link)
      body +=
        ' <a href="' + escapeHtml(r.link) + '" target="_blank" rel="noopener">Read more <i class="fa fa-long-arrow-right"></i></a>';
    return (
      '<div class="recent-news-item">' +
      '<div class="recent-news-date">' + escapeHtml(r.date) + "</div>" +
      '<div class="recent-news-text">' + body + "</div>" +
      "</div>"
    );
  }

  function renderNotice(rows) {
    var html = rows.map(noticeItem).join("");
    var c = byId("cms-notice");
    if (c) c.innerHTML = '<div class="recent-news-list">' + (html || errorHtml("등록된 소식이 없습니다.")) + "</div>";
  }

  function renderRecentNews(rows) {
    var html = rows.slice(0, 3).map(noticeItem).join("");
    var c = byId("cms-recent-news");
    if (c) c.innerHTML = html || '<div class="recent-news-item"><div class="recent-news-text">No recent news.</div></div>';
  }

  /* -------------------------------------------------------------------------
   * 5. 페이지 디스패치
   * ---------------------------------------------------------------------- */
  function init() {
    var page = document.body.getAttribute("data-page");
    switch (page) {
      case "index":
        loadAndRender("notice", "cms-recent-news", renderRecentNews);
        break;
      case "members":
        loadAndRender("members", "cms-members", renderMembers);
        break;
      case "pub-dome":
        loadAndRender("publications_dome", "cms-pubs", function (rows) {
          renderPubs(rows, "Domestic");
        });
        break;
      case "pub-inter":
        loadAndRender("publications_inter", "cms-pubs", function (rows) {
          renderPubs(rows, "International");
        });
        break;
      case "projects":
        loadAndRender("projects", "cms-proj-ongoing", renderProjects);
        break;
      case "lectures":
        loadAndRender("lectures", "cms-lectures", renderLectures);
        break;
      case "gallery":
        loadAndRender("gallery", "cms-gallery", renderGallery);
        break;
      case "notice":
        loadAndRender("notice", "cms-notice", renderNotice);
        break;
      default:
        break;
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // 필요 시 외부에서 재바인딩/설정 접근
  window.CMS = { config: CMS_CONFIG, bindGalleryLightbox: bindGalleryLightbox };
})();
