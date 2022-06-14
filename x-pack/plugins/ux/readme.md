# Documentation for UX UI developers

https://docs.elastic.dev/kibana-dev-docs/welcome

## Running E2E Tests

The tests are managed via the `scripts/e2e.js` file. This script accepts numerous options.

From the kibana root you can run `node x-pack/plugins/ux/scripts/e2e.js` to simply stand up the stack, load data, and run the tests.

If you are developing a new test, it is better to stand up the stack in one shell and load data/run tests in a second session. You can do this by running:

- `node ./x-pack/plugins/ux/scripts/e2e.js --server`
- `node ./x-pack/plugins/ux/scripts/e2e.js --runner`, you can also specify `--grep "{TEST_NAME}"` to run a specific series of tests