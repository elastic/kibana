## How to run tests

First start the servers:

```bash
// ESS
node scripts/scout.js start-server --stateful

// Serverless
node scripts/scout.js start-server --serverless=[es|oblt|security]
```

Then you can run the parallel tests in another terminal:

```bash
// ESS
npx playwright test --config x-pack/solutions/observability/plugins/apm/test/scout/ui/parallel.playwright.config.ts --project=local --grep @ess

// Serverless
npx playwright test --project local --config x-pack/solutions/observability/plugins/apm/test/scout/ui/parallel.playwright.config.ts --grep @svlOblt
```

Test results are available in `x-pack/solutions/observability/plugins/apm/test/scout/ui/output`
