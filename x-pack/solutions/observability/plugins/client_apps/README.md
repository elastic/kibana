# Client Apps Plugin

Plugin that complements client applications' dashboards. It currently allows retracing obfuscated
errors back to human-readable source code references. It is designed to accommodate multiple platforms (Android,
JavaScript, iOS) within the same plugin, with each platform defining its own backend services and UI independently.

## Plugin structure

The plugin is organized into three top-level areas:

- **`common/`** — Types and API path constants shared between client and server.
- **`public/`** — Client-side code: the Kibana app registration, a router, and one view
  component per platform action.
- **`server/`** — Server-side code: route registration, the libraries in
  `lib/`, and shared utilities.

Each platform owns its directory under `server/platforms/` and
`public/platforms/`. Platform code does not import from other platforms.

## Retracing

This feature allows users to understand their app's errors by converting obfuscated stacktraces into human-readable
ones using a pre-uploaded mapping file. Client apps tend to emit obfuscated errors for optimization and security
reasons, making them difficult to debug.

Two things must be in place before the plugin can retrace a stacktrace:

1. **Mapping documents uploaded.** The platform's retrace maps must be uploaded to an
   Elasticsearch index accessible by Kibana before retracing can succeed. When and how this
   upload happens is platform-specific. Refer to each platform's upload tooling for details.

2. **Build identifier present in the log event.** Each crash or error document must carry a
   platform-specific build identifier field that the plugin uses to locate the correct mapping
   index (preferably using
   OpenTelemetry's [app.build_id](https://opentelemetry.io/docs/specs/semconv/registry/attributes/app/#app-build-id)
   attribute).
   The platform's agent or SDK is
   responsible for populating this field at runtime. Without it, the plugin cannot determine
   which mapping to use and will return an error.

### Adding a new platform

Each platform needs four structural pieces:

1. **Server routes** — Create `server/platforms/<platform>/routes.ts` and register it in
   `server/plugin.ts`.
2. **API path constant** — Add the route path to `common/index.ts`.
3. **Client view** — Create a React component under `public/platforms/<platform>/`.
4. **Router entry** — Add a `<Route>` for the new path in `public/app.tsx`.

The new platform will be reachable at `/app/clientApps/<platform>/<action>` via URL
drilldown from any Kibana dashboard.

### Implementing the retrace algorithm

The retrace algorithm for each platform lives in `server/lib/`. The pattern is:

- Extend the abstract `Retracer<MapType>` class from `server/lib/retracer.ts`, providing
  the platform-specific document type as the generic parameter.
- Implement `retrace()` to parse the stacktrace, call `this._fetcher.fetch(identifiers)`
  to retrieve mapping documents in a single batch, and return the retraced stacktrace.
- The `RetraceMapFetcher<MapType>` interface is the only connection between the algorithm
  and storage. The route handler constructs a concrete fetcher that queries Elasticsearch
  using `esClient.mget` or similar; tests pass an in-memory fetcher instead.

The route handler then wires everything together: it receives `{ stacktrace, build_id }`,
constructs the ES fetcher (scoped to the correct index for that build), creates the retracer,
calls `retrace()`, and returns `RetraceResponse` (`{ original, retraced }`).

### Adding backend services to a platform

Each `server/platforms/<platform>/` directory can contain as many modules as needed. Add
new modules there and wire them into the platform's route handler, or add a new route file
if the service needs its own endpoint. Add any new API path constants to `common/index.ts`.

### Adding shared utilities

Utilities needed by more than one platform belong in:

- `server/lib/` for server-side helpers (error handling, retrace libraries, ES client
  wrappers)
- `common/` for types and constants shared between server and client

### URL drilldown integration

The plugin registers with `visibleIn: []`, meaning that it does not appear in Kibana's navigation menu.
Users reach platform views via URL drilldowns configured on dashboard panels.

```
{{kibanaUrl}}/app/clientApps/<platform>/<action>?doc_id={{event.value}}
```

For example, an Android crash dashboard drills down to:

```
{{kibanaUrl}}/app/clientApps/android/retrace?doc_id={{event.value}}
```

For environments where crash documents are written outside the default
`logs-generic.otel*` data stream, the drilldown can include a free-form Elasticsearch
index pattern:

```
{{kibanaUrl}}/app/clientApps/android/retrace?doc_id={{event.value}}&index=logs-myapp.otel*
```

The `index` value is passed to Elasticsearch as the current Kibana user. It is intentionally
free-form so deployments can route crash events to custom data streams or aliases, but the
user must still have Elasticsearch index privileges for the requested pattern.

## Extra info per platform

### Android

Android R8 mapping data is stored in per-build Elasticsearch indices named
`.android-r8-mappings-<build_id>`, where `build_id` is read from the crash document. Each
index contains one document per obfuscated class, with `_id = SHA-256(obfuscated_class)`.

Within each class document, `methods` is an opaque payload keyed by obfuscated method name.
Each method contains ranged `mappings` and, when R8 emitted entries without obfuscated line
ranges, optional `default_mappings`. `default_mappings` are used only when the method has no
ranged mappings at all; an out-of-range line on a ranged method is left unchanged.

R8 extras are forwarded as native JSON under `mappings[].extras`. The retracer handles known
extras such as `outline`, `outlineCallsite`, `rewriteFrame`, and `synthesized`, and ignores
unknown extra IDs or fields so newer R8 metadata can flow through without changing the index
mapping.

## Running tests

```bash
# Unit tests
node scripts/jest x-pack/solutions/observability/plugins/client_apps

# Type checking
node scripts/type_check --project x-pack/solutions/observability/plugins/client_apps/tsconfig.json
```

## Configuration

The plugin exposes a single config flag under `xpack.clientApps.enabled` (defaults to `true`).
