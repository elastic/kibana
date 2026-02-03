# Kibana Serverless Common Functional Tests

The tests in this directory are not project specific and are running
in two or more of the projects. You can use tags to exclude one of the
projects: `skipSvlWorkplaceAI`, `skipSvlOblt`, `skipSvlSearch`, `skipSvlSec`. If no such tag is added,
the test will run in all projects that load this test file in a common config.
Tests that are designed to only run in one of the projects should be added to
the project specific test directory and not to `common` with three skips.

For more information about serverless tests please refer to
[x-pack/platform/test/serverless/README](https://github.com/elastic/kibana/blob/main/[x-pack/platform/test/serverless/README.md).

## Organizing common tests

- Common tests don't have dedicated config files as they run as part of project
  configs.
- There's no top level index file and tests are organized in sub-directories in
  order to better group them based on test run time.
- **If you add a new sub-directory, remember to load it in one of the configs or create a new one for applicable projects (`x-pack/platform/test/serverless/functional/configs/[workplaceai|observability|search|security]`)**
