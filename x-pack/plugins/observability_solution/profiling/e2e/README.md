# Profiling E2E tests

Profiling uses [FTR](../../../../packages/kbn-test/README.md) (functional test runner) and [Cypress](https://www.cypress.io/) to run the e2e tests. The tests are located at `kibana/x-pack/plugins/observability_solution/profiling/e2e/cypress/e2e`.

## E2E Tests (Cypress)

The E2E tests are located in [`x-pack/plugins/observability_solution/profiling/e2e`](../e2e).

Tests run on buildkite PR pipeline are parallelized (4 parallel jobs) and are orchestrated by the Cypress dashboard service. It can be configured in [.buildkite/pipelines/pull_request/profiling_cypress.yml](https://github.com/elastic/kibana/blob/main/.buildkite/pipelines/pull_request/profiling_cypress.yml) with the property `parallelism`.

```yml
    ...
    depends_on: build
    parallelism: 4
    ...
```

## Running it locally

### Start test server

```
node x-pack/plugins/observability_solution/profiling/scripts/test/e2e --server
```

### Run tests
Runs all tests in the terminal

```
node x-pack/plugins/observability_solution/profiling/scripts/test/e2e --runner
```

### Open cypress dashboard
Opens cypress dashboard, there it's possible to select what test you want to run.

```
node x-pack/plugins/observability_solution/profiling/scripts/test/e2e --open
```
### Arguments

| Option       | Description                                     |
| ------------ | ----------------------------------------------- |
| --server     | Only start ES and Kibana                        |
| --runner     | Only run tests                                  |
| --spec       | Specify the specs to run                        |
| --times      | Repeat the test n number of times               |
| --bail       | stop tests after the first failure              |

```
node x-pack/plugins/observability_solution/profiling/scripts/test/e2e.js --runner --spec cypress/e2e/profiling.cy.ts --times 2
```
