# APM E2E

APM uses [FTR](../../../../packages/kbn-test/README.md) (functional test runner) and [Cypress](https://www.cypress.io/) to run the e2e tests. The tests are located at `kibana/x-pack/plugins/apm/ftr_e2e/cypress/integration`.

## Running tests

**Run all tests**

```sh
//kibana directory
node x-pack/plugins/apm/scripts/ftr_e2e/cypress_run.js
```

**Run specific test**

```sh
//kibana directory
node x-pack/plugins/apm/scripts/ftr_e2e/cypress_run.js --spec ./cypress/integration/read_only_user/home.spec.ts
```

## Opening tests

```sh
//kibana directory
node x-pack/plugins/apm/scripts/ftr_e2e/cypress_open.js
```
