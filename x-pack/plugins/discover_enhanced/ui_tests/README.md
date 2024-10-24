## How to run tests
First start the servers with

```bash
node scripts/functional_tests_server.js --config x-pack/test/api_integration/deployment_agnostic/configs/stateful/platform.stateful.config.ts
```

Then you can run the tests multiple times in another terminal with:

```bash
npx playwright test --config x-pack/plugins/discover_enhanced/ui_tests/playwright.config.ts
```

Test results are available in `x-pack/plugins/discover_enhanced/ui_tests/output`
