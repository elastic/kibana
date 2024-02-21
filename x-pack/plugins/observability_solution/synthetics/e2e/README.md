## How to run these tests

These tests rely on the Kibana functional test runner. There is a Kibana config in this directory, and a dedicated
script for standing up the test server.

### Start the server

From `~/x-pack/plugins/observability_solution/synthetics/scripts`, run `node e2e.js --server`. Wait for the server to startup. It will provide you
with an example run command when it finishes.

### Run the tests

From the same directory you can now run `node e2e.js --runner`.

In addition to the usual flags like `--grep`, you can also specify `--no-headless` in order to view your tests as you debug/develop.


## Uptime App Tests

These tests rely on the Kibana functional test runner. There is a Kibana config in this directory, and a dedicated
script for standing up the test server.

### Start the server

From `~/x-pack/plugins/observability_solution/synthetics/scripts`, run `node uptime_e2e.js --server`. Wait for the server to startup. It will provide you
with an example run command when it finishes.

### Run the tests

From the same directory you can now run `node node uptime_e2e.js --runner`.

In addition to the usual flags like `--grep`, you can also specify `--no-headless` in order to view your tests as you debug/develop.
