## How to run tests

First start the servers:

```bash
// ESS
node scripts/scout.js start-server --arch stateful --domain classic

// Serverless
node scripts/scout.js start-server --arch serverless --domain [search|observability_complete|security_complete]
```

Then you can run the parallel tests in another terminal:

```bash
// ESS
node scripts/playwright test --config x-pack/solutions/observability/plugins/apm/test/scout/ui/parallel.playwright.config.ts --project=local --grep stateful-classic

// Serverless
node scripts/playwright test --project local --config x-pack/solutions/observability/plugins/apm/test/scout/ui/parallel.playwright.config.ts --grep serverless-observability_complete
```

Test results are available in `x-pack/solutions/observability/plugins/apm/test/scout/ui/output`

## Tests behind the service map grouping flag

Service map grouping is behind the `apm.serviceMapGroupingEnabled` feature flag, which is off by default. To turn it on locally, add this to `config/kibana.dev.yml`:

```yaml
feature_flags.overrides:
  apm.serviceMapGroupingEnabled: true
```

In Scout, turn the flag on at runtime with the helpers exported from `shared/`:

```ts
import { enableServiceMapGrouping, removeServiceMapGroupingOverride } from '../../shared';

test.beforeAll(async ({ apiServices }) => {
  await enableServiceMapGrouping(apiServices);
});

test.afterAll(async ({ apiServices }) => {
  await removeServiceMapGroupingOverride(apiServices);
});
```

- Be mindful of adding these tests in parallel suites. Feature flag overrides apply to the whole Kibana server, so enabling the flag from `ui/parallel_tests/` would also affect the other workers.
- Always remove the override in teardown, so it doesn't leak into the next suite that runs on the same server.

This section, the helpers and the flag are removed in https://github.com/elastic/kibana/issues/300607.
