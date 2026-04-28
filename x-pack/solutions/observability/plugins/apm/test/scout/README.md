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
npx playwright test --config x-pack/solutions/observability/plugins/apm/test/scout/ui/parallel.playwright.config.ts --project=local --grep stateful-classic

// Serverless
npx playwright test --project local --config x-pack/solutions/observability/plugins/apm/test/scout/ui/parallel.playwright.config.ts --grep serverless-observability_complete
```

Test results are available in `x-pack/solutions/observability/plugins/apm/test/scout/ui/output`
