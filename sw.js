/* ディスプレイ半導体 問題集 — Service Worker (オフライン対応) */
const CACHE = "dq-cache-v30";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-180.png",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // クラウド同期(GitHub API / Gist raw)はキャッシュせず常にネットワークへ
  if (url.hostname === "api.github.com" || url.hostname === "gist.githubusercontent.com") return;

  // HTMLドキュメントはネットワーク優先（オンライン時は常に最新を取得、オフライン時のみキャッシュ）
  if (req.mode === "navigate" || req.destination === "document") {
    e.respondWith(
      fetch(req).then((resp) => { const copy = resp.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return resp; })
        .catch(() => caches.match(req).then((r) => r || caches.match("./index.html")))
    );
    return;
  }

  // cache-first（オフライン優先）。取得できた同一オリジンGETは追加キャッシュ
  e.respondWith(
    caches.match(req).then((cached) =>
      cached ||
      fetch(req).then((resp) => {
        if (resp && resp.ok && url.origin === location.origin) {
          const copy = resp.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return resp;
      }).catch(() => caches.match("./index.html"))
    )
  );
});
