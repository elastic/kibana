## How to run tests
First start the servers with

```bash
// ESS
node scripts/scout_start_servers.js --stateful
// Serverless
node scripts/scout_start_servers.js --serverless=es
```

Then you can run the tests multiple times in another terminal with:

```bash
// ESS
npx playwright test --config x-pack/plugins/discover_enhanced/ui_tests/playwright.config.ts --grep @ess
// Serverless
npx playwright test --config x-pack/plugins/discover_enhanced/ui_tests/playwright.config.ts --grep @svlSearch // @svlOblt, @svlSecurity
```

Test results are available in `x-pack/plugins/discover_enhanced/ui_tests/output`
