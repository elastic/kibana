## How to run these tests

These tests rely on the Kibana functional test runner. There is a Kibana config in this directory, and a dedicated
script for standing up the test server.

### Start the server

From `~/x-pack/plugins/ux/scripts`, run `node e2e.js --server`. Wait for the server to startup. It will provide you
with an example run command when it finishes.

### Run the tests

From this directory, `~/x-pack/plugins/ux/e2e`, you can now run `node ../../../../scripts/functional_test_runner --config synthetics_run.ts`.

In addition to the usual flags like `--grep`, you can also specify `--no-headless` in order to view your tests as you debug/develop.
