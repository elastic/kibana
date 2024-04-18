# Testing

We've got three ways of testing our code:

- Unit testing with Jest
- API testing
- End-to-end testing (with Cypress)

API tests are usually preferred. They're stable and reasonably quick, and give a good approximation of real-world usage.
E2E testing is suitable for common and vital user journeys. They are however less stable than API tests.
Unit testing is a good approach if you have a very specific piece of code with lots of possibilities that you want to test.

## Unit Tests (Jest)

```
node x-pack/plugins/observability_solution/apm/scripts/test/jest [--watch] [--updateSnapshot]
```

#### Coverage

HTML coverage report can be found in target/coverage/jest after tests have run.

```
open target/coverage/jest/index.html
```

---

## API Tests

| Option       | Description                                     |
| ------------ | ----------------------------------------------- |
| --basic      | Run tests with basic license                    |
| --trial      | Run tests with trial license                    |
| --server     | Only start ES and Kibana                        |
| --runner     | Only run tests                                  |
| --grep       | Specify the specs to run                        |
| --grep-files | Specify the files to run                        |
| --inspect    | Add --inspect-brk flag to the ftr for debugging |
| --times      | Repeat the test n number of times               |

The API tests are located in [`x-pack/test/apm_api_integration/`](/x-pack/test/apm_api_integration/).

#### Start server and run test (single process)

```
node x-pack/plugins/observability_solution/apm/scripts/test/api [--trial/--basic] [--help]
```

The above command will start an ES instance on http://localhost:9220, a Kibana instance on http://localhost:5620 and run the api tests.
Once the tests finish, the instances will be terminated.

#### Start server and run test (separate processes)

```sh

# start server
node x-pack/plugins/observability_solution/apm/scripts/test/api --server --basic

# run tests
node x-pack/plugins/observability_solution/apm/scripts/test/api --runner --basic --grep-files=error_group_list
```

### Update snapshots (from Kibana root)

To update snapshots append `--updateSnapshots` to the `--runner` command:

```
node x-pack/plugins/observability_solution/apm/scripts/test/api --runner --basic --updateSnapshots
```

(The test server needs to be running)

#### API Test tips

- For data generation in API tests have a look at the [kbn-apm-synthtrace](../../../../packages/kbn-apm-synthtrace/README.md) package
- For debugging access Elasticsearch on http://localhost:9220 and Kibana on http://localhost:5620 (`elastic` / `changeme`)

---

## E2E Tests (Cypress)

The E2E tests are located in [`x-pack/plugins/observability_solution/apm/ftr_e2e`](../ftr_e2e).

When PR is labeled with `apm:cypress-record`, test runs are recorded to the [Cypress Dashboard](https://dashboard.cypress.io).

Tests run on buildkite PR pipeline are parallelized (4 parallel jobs) and are orchestrated by the Cypress dashboard service. It can be configured in [.buildkite/pipelines/pull_request/apm_cypress.yml](https://github.com/elastic/kibana/blob/main/.buildkite/pipelines/pull_request/apm_cypress.yml) with the property `parallelism`.

```yml
    ...
    depends_on: build
    parallelism: 4
    ...
```

[Test tips and best practices](../ftr_e2e/README.md)

#### Start test server

```
node x-pack/plugins/observability_solution/apm/scripts/test/e2e --server
```

#### Run tests

```
node x-pack/plugins/observability_solution/apm/scripts/test/e2e --runner --open
```

### Run tests multiple times to check for flakiness

```
node x-pack/plugins/observability_solution/apm/scripts/test/e2e --runner --times <NUMBER> [--spec <FILE_NAME>]
```

### A11y checks

Accessibility tests are added on the e2e with `checkA11y()`, they will run together with cypress.

---

## Functional tests (Security and Correlations tests)

```sh
# Start server
node scripts/functional_tests_server --config x-pack/test/functional/apps/apm/config.ts

# Run tests
node scripts/functional_test_runner --config x-pack/test/functional/apps/apm/config.ts --grep='APM specs'
```

APM tests are located in `x-pack/test/functional/apps/apm`.
For debugging access Elasticsearch on http://localhost:9220` (elastic/changeme)
diff --git a/x-pack/plugins/observability_solution/apm/scripts/test/README.md b/x-pack/plugins/observability_solution/apm/scripts/test/README.md

## Serverless API tests

#### Start server and run tests (single process)

```
node scripts/functional_tests.js --config x-pack/test_serverless/api_integration/test_suites/observability/config.ts
```

#### Start server and run tests (separate processes)

```sh
# Start server
node scripts/functional_tests_server.js --config x-pack/test_serverless/api_integration/test_suites/observability/config.ts

# Run tests
node scripts/functional_test_runner --config=x-pack/test_serverless/api_integration/test_suites/observability/config.ts
```

## Storybook

### Start

```
yarn storybook apm
```

All files with a .stories.tsx extension will be loaded. You can access the development environment at http://localhost:9001.

## Data generation

For end-to-end (e.g. agent -> apm server -> elasticsearch <- kibana) development and testing of Elastic APM please check the the [APM Integration Testing repository](https://github.com/elastic/apm-integration-testing).

Data can also be generated using the [kbn-apm-synthtrace](../../../../packages/kbn-apm-synthtrace/README.md) CLI.

## Best practices for API tests

### 1. File structure:

- **Endpoint-specific testing**: Each API endpoint should ideally be tested in an individual `*.spec.ts` file. This makes it easy to find tests, and works well with our general approach of having single-purpose API endpoints.
- **Directory structure**: Organize these files into feature-specific folders to make navigation easier. Each feature-specific folder can have multiple `*.spec.ts` files related to that particular feature.

### 2. Data:

- **Prefer Synthtrace**: Use Synthtrace for all new tests. It offers better control over data being fed into Elasticsearch, making it easier to verify calculated statistics than using Elasticsearch archives.
- **Migrating existing tests**: Aim to migrate existing tests that are based on Elasticsearch archives to Synthtrace. If for some reason Synthtrace isn't suitable, it's preferable to manually index documents rather than using ES archives.
- **Scenario management**:
  - Prefer to keep the Synthtrace scenario in the same file. This makes it easier to see what's going on.
  - If you do end up moving the Synthtrace scenario to another file because it gets too long, make sure the inputs are passed as parameters to a function. This keeps the information information in the test file and prevents the reader from navigating back and forth.
  - Avoid re-using the same Synthtrace scenario across multiple files (in the same file it's mostly fine, but a test-specific Synthtrace scenario doesn't hurt). Re-using it will result in less specific scenarios, making it harder to write specific tests. The single scenario will grow unwieldy. It's akin to using ES archives.
- **ML**: For tests that require ML data, use the `createAndRunApmMlJob` helper function. This starts an ML job and returns only when it has completed, including any anomalies that are generated.
- **Alerting**: For tests that require alerting data, use the `createApmRule` and `waitForRuleStatus` helpers. `createApmRule` sets some defaults when creating a rule, and `waitForRuleStatus` only return when a certain status is matching your expectations. This allows you to e.g. wait until an alert fires or recovers after exceeding a threshold

### 3. Scope of tests:

- **Different configurations**: Tests can run for different configurations. This allows us to keep e.g. a test whether an endpoint correctly throws with a failed license check in the same file as one that tests the return values from the endpoint if a license check doesn't fail.
- **Specificity**: Make checks as detailed as possible. Avoid broad "has data" checks, especially when return values can be controlled by Synthtrace. Avoid using snapshot testing.
- **Error handling**: For API endpoints that might return specific error codes or messages, ensure there are tests covering those specific scenarios.

### 4. Security and access control:

- **User privileges**: For calling APIs use `apm.readUser` whenever possible. If the endpoint requires write privileges, use `apm.writeUser` or any of the other predefined roles, whichever apply. Don't use roles with higher access levels unless required.
