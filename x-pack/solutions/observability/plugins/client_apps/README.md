# Client Apps Plugin

Kibana plugin for resolving obfuscated or minified client application stacktraces back to
human-readable source code references. Supports multiple client platforms (Android, JavaScript,
and future iOS) within a single plugin, with each platform defining its own backend services
and UI independently.

## Plugin structure

```
client_apps/
├── kibana.jsonc                                  Plugin manifest
├── tsconfig.json                                 TypeScript configuration
├── jest.config.js                                Jest test configuration
├── common/                                       Shared constants and types
│   ├── index.ts                                  Plugin ID, API paths, index names
│   └── types.ts                                  Shared interfaces (e.g. SymbolicationResponse)
├── public/                                       Client-side (browser)
│   ├── index.ts                                  Entry point — exports plugin class
│   ├── plugin.ts                                 Registers the Kibana app
│   ├── app.tsx                                   Router — dispatches to platform views
│   └── platforms/
│       ├── android/
│       │   └── retrace_view.tsx                  Android R8 deobfuscation UI
│       └── javascript/
│           └── sourcemap_view.tsx                JS source map resolution UI (placeholder)
└── server/                                       Server-side (Node.js)
    ├── index.ts                                  Config schema + plugin export
    ├── plugin.ts                                 Wires together all platform routes
    ├── lib/
    │   └── handle_route_error.ts                 Shared error handler for routes
    └── platforms/
        ├── android/
        │   ├── routes.ts                         POST /internal/client_apps/android/retrace
        │   ├── retrace.ts                        Core retrace algorithm
        │   ├── fetch_crash_doc.ts                Fetch crash document from ES
        │   ├── fetch_mappings.ts                 Batch-fetch R8 mapping documents
        │   └── parse_mapping_entry.ts            Parse pipe-delimited mapping entries
        └── javascript/
            └── routes.ts                         JS source map routes (placeholder)
```

### Design principles

- **Platform isolation** — Each platform (Android, JavaScript, iOS) owns its own directory
  under both `server/platforms/` and `public/platforms/`. Platform code does not import from
  other platforms.
- **Shared shell** — The top-level plugin (`plugin.ts` on both sides) is a thin shell that
  registers routes and UI from each platform. Shared utilities live in `server/lib/` and
  `common/`.
- **Common response contract** — All symbolication APIs return a `SymbolicationResponse`
  (`{ original, resolved }`) defined in `common/types.ts`, so the UI can treat platforms
  uniformly when needed.

## How to add a new platform

Adding support for a new client platform (e.g. iOS) requires touching four places:

### 1. Server-side routes

Create `server/platforms/ios/routes.ts`:

```typescript
import type { IRouter, Logger } from '@kbn/core/server';

export function registerIosRoutes({ router, logger }: { router: IRouter; logger: Logger }) {
  // Register POST /internal/client_apps/ios/symbolicate (or similar)
}
```

Wire it into `server/plugin.ts`:

```typescript
import { registerIosRoutes } from './platforms/ios/routes';

// Inside setup():
registerIosRoutes(params);
```

### 2. API path constant

Add the new route path to `common/index.ts`:

```typescript
export const IOS_SYMBOLICATE_API_PATH = '/internal/client_apps/ios/symbolicate';
```

### 3. Client-side view

Create `public/platforms/ios/symbolicate_view.tsx` with a React component.

### 4. Router entry

Add a `<Route>` in `public/app.tsx`:

```tsx
import { SymbolicateView } from './platforms/ios/symbolicate_view';

// Inside the <Router>:
<Route path="/ios/symbolicate" render={() => <SymbolicateView core={core} />} />
```

That's it — the new platform is reachable at `/app/clientApps/ios/symbolicate` via URL
drilldown from any Kibana dashboard.

## How to add backend services to an existing platform

Each platform directory under `server/platforms/<platform>/` can contain as many modules as
needed. For example, to add a new service to the Android platform:

1. Create the module in `server/platforms/android/my_service.ts`.
2. Import and use it from `server/platforms/android/routes.ts` (for route handlers) or
   from a new route file if the service needs its own endpoint.
3. If the new service needs a new API path, add the constant to `common/index.ts`.

The same pattern applies for adding new UI pages: create a new view component under
`public/platforms/<platform>/` and add a corresponding `<Route>` in `public/app.tsx`.

## How to add shared utilities

Utilities needed by multiple platforms belong in:

- `server/lib/` for server-side helpers (e.g. error handling, ES client wrappers)
- `common/` for types and constants shared between server and client

## URL drilldown integration

The plugin registers with `visibleIn: []` — it does not appear in Kibana's navigation menu.
Users reach platform views via URL drilldowns configured on dashboard panels. The URL
pattern is:

```
{{kibanaUrl}}/app/clientApps/<platform>/<action>?doc_id={{event.value}}&index=<optional>
```

For example, an Android crash dashboard drills down to:

```
{{kibanaUrl}}/app/clientApps/android/retrace?doc_id={{event.value}}
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
