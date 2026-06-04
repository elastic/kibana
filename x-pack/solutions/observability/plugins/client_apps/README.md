# Client Apps Plugin

Kibana plugin for resolving obfuscated or minified client application stacktraces back to
human-readable source code references. Supports multiple client platforms (Android, JavaScript,
and future iOS) within a single plugin, with each platform defining its own backend services
and UI independently.

## Plugin structure

The plugin is organized into three top-level areas:

- **`common/`** — Types and API path constants shared between client and server.
- **`public/`** — Client-side code: the Kibana app registration, a router, and one view
  component per platform action.
- **`server/`** — Server-side code: route registration, the retrace libraries in
  `lib/`, and shared utilities.

Each platform (Android, JavaScript, …) owns a dedicated subdirectory under both
`server/platforms/` and `public/platforms/`. Platform code does not import across platforms.

### Design principles

- **Platform isolation** — Each platform owns its directory under `server/platforms/` and
  `public/platforms/`. Platform code does not import from other platforms.
- **Shared shell** — The top-level `plugin.ts` on both sides is a thin shell that wires up
  each platform. Shared utilities live in `server/lib/` and `common/`.
- **Common response contract** — All retrace APIs return `{ original, retraced }`
  (defined in `common/types.ts`), so the UI can treat all platforms uniformly.
- **Storage-agnostic retrace algorithm** — Retracer libraries in `server/lib/` are decoupled
  from Elasticsearch via a `RetraceMapFetcher` interface. Route handlers inject an ES-backed
  fetcher; tests inject in-memory documents, keeping the core algorithm independently
  testable without a running cluster.

## Prerequisites for retracing

Two things must be in place before the plugin can retrace a stacktrace:

1. **Mapping documents uploaded.** The platform's retrace maps must be uploaded to an
   Elasticsearch index accessible by Kibana before retracing can succeed. When and how this
   upload happens is platform-specific — refer to each platform's upload tooling for details.

2. **`app.build_id` present in the log event.** Each crash or error document must carry a
   `build_id` field (at `attributes.app.build_id`) that the plugin uses to locate the correct
   mapping index. The platform's agent or SDK is responsible for populating this field at
   runtime. Without it the plugin cannot determine which mapping to use and will return an
   error.

## Adding a new platform

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

## Adding backend services to a platform

Each `server/platforms/<platform>/` directory can contain as many modules as needed. Add
new modules there and wire them into the platform's route handler, or add a new route file
if the service needs its own endpoint. Add any new API path constants to `common/index.ts`.

## Adding shared utilities

Utilities needed by more than one platform belong in:

- `server/lib/` for server-side helpers (error handling, retrace libraries, ES client
  wrappers)
- `common/` for types and constants shared between server and client

## URL drilldown integration

The plugin registers with `visibleIn: []` — it does not appear in Kibana's navigation menu.
Users reach platform views via URL drilldowns configured on dashboard panels:

```
{{kibanaUrl}}/app/clientApps/<platform>/<action>?doc_id={{event._id}}
```

## Running tests

```bash
# Unit tests
yarn test:jest x-pack/solutions/observability/plugins/client_apps

# Type checking
yarn test:type_check --project x-pack/solutions/observability/plugins/client_apps/tsconfig.json
```

## Configuration

The plugin exposes a single config flag under `xpack.clientApps.enabled` (defaults to `true`).
