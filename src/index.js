const PUBLIC_BASE = "https://pub-e67a8a5213994a26891618746eef09f7.r2.dev";

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: cors() });
    if (request.method !== "PUT" && request.method !== "POST") {
      return json({ error: "method_not_allowed" }, 405);
    }

    const secret = request.headers.get("X-Upload-Secret") || "";
    if (secret !== env.UPLOAD_SECRET) return json({ error: "unauthorized" }, 401);

    const userId = request.headers.get("X-User-Id") || "";
    if (!userId) return json({ error: "no_user" }, 400);

    const url = new URL(request.url);
    const parts = url.pathname.split("/").filter(Boolean);

    let key;
    if (parts[0] === "avatar") key = `avatars/${userId}.jpg`;
    else if (parts[0] === "cover") key = `covers/${userId}.jpg`;
    else if (parts[0] === "post" && parts[1]) key = `posts/${userId}/${parts[1]}.jpg`;
    else return json({ error: "bad_path" }, 400);

    const buf = await request.arrayBuffer();
    if (buf.byteLength === 0) return json({ error: "empty" }, 400);
    if (buf.byteLength > 5 * 1024 * 1024) return json({ error: "too_big" }, 413);

    await env.MEDIA.put(key, buf, {
      httpMetadata: { contentType: "image/jpeg", cacheControl: "public, max-age=31536000" }
    });

    return json({ success: true, url: `${PUBLIC_BASE}/${key}`, key });
  }
};

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "PUT, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-User-Id, X-Upload-Secret"
  };
}
function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status, headers: { "Content-Type": "application/json", ...cors() }
  });
}
