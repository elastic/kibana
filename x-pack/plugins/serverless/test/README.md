# Tests for plugin `serverless`

The tests and helper methods (services, page objects) defined here should cover
common Kibana serverless functionality (core, shared UX, ...).

All tests and helper methods specific to a serverless project should go into
the `test` directory of the respective serverless project plugin
(`serverless_observability`, `serverless_search`, `serverless_security`).

## Serverless testing structure and conventions

The test structure in each of the serverless plugins corresponds to what we
have in `x-pack/test` with API tests in `api_integration` and UI tests in
`functional`.

### Shared services and page objects

`serverless` plugin
- test services and page objects from `x-pack/test/[api_integration|functional]`
are available for reuse
- serverless specific services and page objects that are commonly used across
projects are defined here

`serverless_<project>` plugins
- test services and page objects from the `serverless` are available for reuse,
which includes the items from `x-pack/test/[api_integration|functional]`
- serverless project specific services and page objects are defined here

All serverless specific services and page objects are implemented in serverless
plugins only and may not be added to or make modifications in `x-pack/test`.

With that level of helper method reuse, we have to avoid name clashes and go
with the following namesapces:

| plugin                   | namespace for helper methods |
| ------------------------ | ---------------------------- |
| serverless               | svlCommon                    |
| serverless_observability | svlOblt                      |
| serverless_search        | svlSearch                    |
| serverless_security      | svlSec                       |

### Overview

x-pack/plugins/
├─ serverless/test                // common functionality, prefix helpers with svlCommon
│  ├─ api_integration
│  ├─ functional
├─ serverless_observability/test  // o11y project functionality, prefix helpers with svlOblt
│  ├─ api_integration
│  ├─ functional
├─ serverless_search/test         // search project functionality, prefix helpers with svlSearch
│  ├─ api_integration
│  ├─ functional
├─ serverless_security/test       // security project functionality, prefix helpers with svlSec
│  ├─ api_integration
│  ├─ functional

## Run tests
Similar to how functional tests are run in `x-pack/test`, you can point the
functional tests server and test runner to config files in this plugin test
directory, e.g. from the `x-pack` directory run:
```
node scripts/functional_tests_server.js --config plugins/serverless/test/api_integration/test_suites/config.ts

node scripts/functional_test_runner.js --config plugins/serverless/test/api_integration/test_suites/config.ts
```