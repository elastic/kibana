# Tests for plugin `serverless_security`

The tests and helper methods (services, page objects) defined here should cover
serverless functionality specific to the security project.

Tests and helper methods for common Kibana serverless functionality (core,
shared UX, ...) should go into the `test` directory of the `serverless` plugin.

Find more details around structure, coventions, etc. for serverless tests in
`x-pack/plugins/serverless/test/README.md`.

## Run tests
Similar to how functional tests are run in `x-pack/test`, you can point the
functional tests server and test runner to config files in this plugin's test
directory, e.g. from the `x-pack` directory run:
```
node scripts/functional_tests_server.js --config plugins/serverless_security/test/functional/test_suites/config.ts

node scripts/functional_test_runner.js --config plugins/serverless_security/test/functional/test_suites/config.ts
```