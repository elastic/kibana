# Testing

## Unit Tests (Jest)

```
node scripts/test/jest [--watch] [--updateSnapshot]
```

#### Coverage

HTML coverage report can be found in target/coverage/jest after tests have run.

```
open target/coverage/jest/index.html
```

---

## API Tests

API tests are separated in two suites:

- a basic license test suite [default]
- a trial license test suite (the equivalent of gold+)

```
node scripts/test/api [--trial] [--help]
```

The API tests are located in [`x-pack/test/apm_api_integration/`](/x-pack/test/apm_api_integration/).

**API Test tips**

- For data generation in API tests have a look at the [elastic-apm-synthtrace](../../../../packages/elastic-apm-synthtrace/README.md) package
- For debugging access Elasticsearch on http://localhost:9220 and Kibana on http://localhost:5620 (`elastic` / `changeme`)
- To update snapshots append `--updateSnapshots` to the functional_test_runner command

---

## E2E Tests (Cypress)

```
node scripts/test/e2e [--trial] [--help]
```

The E2E tests are located in [`x-pack/plugins/apm/ftr_e2e`](../ftr_e2e)

---

## Functional tests (Security and Correlations tests)

TODO: We could try moving this tests to the new e2e tests located at `x-pack/plugins/apm/ftr_e2e`.

**Start server**

```
node scripts/functional_tests_server --config x-pack/test/functional/config.js
```

**Run tests**

```
node scripts/functional_test_runner --config x-pack/test/functional/config.js --grep='APM specs'
```

APM tests are located in `x-pack/test/functional/apps/apm`.
For debugging access Elasticsearch on http://localhost:9220` (elastic/changeme)
diff --git a/x-pack/plugins/apm/scripts/test/README.md b/x-pack/plugins/apm/scripts/test/README.md

## Storybook

### Start

```
yarn storybook apm
```

All files with a .stories.tsx extension will be loaded. You can access the development environment at http://localhost:9001.

## Data generation

For end-to-end (e.g. agent -> apm server -> elasticsearch <- kibana) development and testing of Elastic APM please check the the [APM Integration Testing repository](https://github.com/elastic/apm-integration-testing).

Data can also be generated using the [elastic-apm-synthtrace](../../../../packages/elastic-apm-synthtrace/README.md) CLI.
