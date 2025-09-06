# Kibana Serverless Common Functional Tests

The `common` tests in this directory are not project specific and are running
in two or three of the projects. You can use tags to exclude one of the
projects: `skipSvlOblt`, `skipSvlSearch`, `skipSvlSec`. If no such tag is added,
the test will run in all three projects.
Tests that are designed to only run in one of the projects should be added to
the project specific test directory and not to `common` with two skips.

For more information about serverless tests please refer to
[x-pack/test_serverless/README](https://github.com/elastic/kibana/blob/main/x-pack/test_serverless/README.md).

## Organizing common tests

- Common tests don't have dedicated config files as they run as part of project
configs.
- There's no top level index file and tests are organized in sub-directories in
order to better group them based on test run time.
- **If you add a new `common` sub-directory, remember to add it to the `common_configs` of all projects (`x-pack/test_serverless/functional/test_suites/[observability|search|security]/common_configs`)**





