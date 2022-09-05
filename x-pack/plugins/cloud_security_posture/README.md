# Cloud Security Posture Kibana Plugin

Cloud Posture automates the identification and remediation of risks across cloud infrastructures

---

## Development

See the [kibana contributing guide](https://github.com/elastic/kibana/blob/main/CONTRIBUTING.md) for instructions
setting up your development environment.

### Install pre-commit hooks

We
use [pre-commit](https://docs.elastic.dev/kibana-dev-docs/getting-started/setup-dev-env#install-pre-commit-hook-optional)
to run linters and tests before each commit. To install the pre-commit hooks, run the following command from the root of
the repository:

```bash
node scripts/register_git_hook
```

### Local checks before creating a PR

Kibana has a pretty long CI process.
Therefore, we suggest running the following commands locally before creating a PR:

1. Typescript check: `node_modules/.bin/tsc -b x-pack/plugins/cloud_security_posture/tsconfig.json --pretty`
2. Linter check: `yarn lint:es x-pack/plugins/cloud_security_posture`
3. Unit tests: `yarn jest --config x-pack/plugins/cloud_security_posture/jest.config.js`

### Running unit tests

Our [unit tests](https://docs.elastic.dev/kibana-dev-docs/tutorials/testing-plugins#unit-testing) are written using [jest](https://jestjs.io/) framework.
Jest provides you a fast and easy test framework that allow you to run test in parallel, collect code coverage
information and create mocks for any object inside/outside your test scope.

Jest runs all tests that: found in any file within a `__tests__` directory or any file with a suffix of `.test.js`
, `.test.ts`
, `.test.jsx`, or `.test.tsx`.

As a convention, we use the `.test.ts` suffix for all our tests.

You can run all cloud security posture tests with the following command:

```bash
yarn jest --config x-pack/plugins/cloud_security_posture/jest.config.js
```

To run a specific test, you can use the `--testNamePattern` flag:

```bash
yarn jest --config x-pack/plugins/cloud_security_posture/jest.config.js --testNamePattern=FilePattern -t MyTest
```

### Running integration tests

The cloud security posture plugin has also [integration tests](https://docs.elastic.dev/kibana-dev-docs/tutorials/testing-plugins#integration-tests) that run against a real Elasticsearch and Kibana instances.
We use these tests to verify that the plugin works as expected when running in a real environment.
In order to run the integration tests, you need to have a running Elasticsearch and Kibana instances with the
integration test configuration.

You can run Kibana and Elastic with the integration test configuration by running the following command from the root of
the Kibana repository:

```bash
node scripts/functional_tests_server.js --config x-pack/test/api_integration/config.ts
```

** You should wait until the server is ready to accept connections before running the integration tests.

Then, in a separate terminal, you can run the integration test.
In order to do so, run the following command:

``` bash  
node scripts/functional_test_runner.js --config x-pack/test/api_integration/config.ts --include=test_file_path
```