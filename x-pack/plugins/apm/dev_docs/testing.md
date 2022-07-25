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

| Option    | Description                                     |
| --------- | ----------------------------------------------- |
| --basic   | Run tests with basic license                    |
| --trial   | Run tests with trial license                    |
| --server  | Only start ES and Kibana                        |
| --runner  | Only run tests                                  |
| --grep    | Specify the spec files to run                   |
| --inspect | Add --inspect-brk flag to the ftr for debugging |
| --times   | Repeat the test n number of times               |

The API tests are located in [`x-pack/test/apm_api_integration/`](/x-pack/test/apm_api_integration/).

### Start server and run test in a single process

```
node scripts/test/api [--trial/--basic] [--help]
```

The above command will start an ES instance on http://localhost:9220, a Kibana instance on http://localhost:5620 and run the api tests.
Once the tests finish, the instances will be terminated.

### Start server and run test in separate processes

```sh

# start server
node scripts/test/api --server --basic

# run tests
node scripts/test/api --runner --basic
```

### Update snapshots (from Kibana root)

To update snapshots append `--updateSnapshots` to the `--runner` command:

```
node scripts/test/api --runner --basic --updateSnapshots
```

(The test server needs to be running)

**API Test tips**

- For data generation in API tests have a look at the [elastic-apm-synthtrace](../../../../packages/elastic-apm-synthtrace/README.md) package
- For debugging access Elasticsearch on http://localhost:9220 and Kibana on http://localhost:5620 (`elastic` / `changeme`)

---

## E2E Tests (Cypress)

The E2E tests are located in [`x-pack/plugins/apm/ftr_e2e`](../ftr_e2e)

### Start test server

```
node x-pack/plugins/apm/scripts/test/e2e.js --server
```

### Run tests

```
node x-pack/plugins/apm/scripts/test/e2e.js --open
```

### A11y checks

Accessibility tests are added on the e2e with `checkA11y()`, they will run together with cypress.

---

## Functional tests (Security and Correlations tests)

TODO: We could try moving this tests to the new e2e tests located at `x-pack/plugins/apm/ftr_e2e`.

**Start server**

```
node scripts/functional_tests_server --config x-pack/test/functional/config.base.js
```

**Run tests**

```
node scripts/functional_test_runner --config x-pack/test/functional/config.base.js --grep='APM specs'
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
