# Tests for plugin `serverless`

The tests and helper methods (services, page objects) defined here should cover
common Kibana serverless functionality (core, shared UX, ...). All tests and
helper methods specific to a serverless project should go into the `test`
directory of the respective serverless project plugin (`serverless_observability`, `serverless_search`, `serverless_security`).

## Structure

The test structure corresponds to what we have in `x-pack/test` with API tests
in `api_integration` and UI tests in `functional`. These test areas make the
services and page objects from `x-pack/test/[api_integration|functional]`
available for re-use. However, all common serverless specific helper methods
should be implemented in services or page objects in the test directory of this
plugin and not added to or modified in `x-pack/test`.

## Run tests
Similar to how functional tests are run in `x-pack/test`, you can point the
functional tests server and test runner to config files in this plugin test
directory, e.g.
```
node scripts/functional_tests_server.js --config plugins/serverless/test/api_integration/test_suites/config.ts

node scripts/functional_test_runner.js --config plugins/serverless/test/api_integration/test_suites/config.ts
```