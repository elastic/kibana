# Cloud Security Posture Kibana Plugin

Cloud Posture automates the identification and remediation of risks across cloud infrastructures

---
## Table of contents
- [Development](#development)
  - [Running unit tests](#running-unit-tests)
  - [Running integration tests](#running-integration-tests)
- [Code guidelines](#code-guidelines)
---
## Development

See the [kibana contributing guide](https://github.com/elastic/kibana/blob/main/CONTRIBUTING.md) for instructions setting up your development environment.

### Local checks before creating a PR
Kibana has a pretty long CI process.
Therefore, we suggest running the following commands locally before creating a PR:
1. typescript check: node_modules/.bin/tsc -b x-pack/plugins/cloud_security_posture/tsconfig.json --pretty
2. linter check: yarn lint:es x-pack/plugins/cloud_security_posture
3. unit tests: yarn jest --config x-pack/plugins/cloud_security_posture/jest.config.js

### Running unit tests
Our unit tests are written using [jest](https://jestjs.io/) framework.
Jest provides you a fast and easy test framework that allow you to run test in parallel, collect code coverage information and a custom resolver for imports making it simple to mock any object outside of your test scope.

Jest runs all tests found in any file wit

hin a `__tests__` directory or any file with a suffix of `.test.js`, `.test.ts`, `.test.jsx`, or `.test.tsx`.
As a convention, we use the `.test.ts` suffix for all our tests.

You can run the unit tests with the following command:

```bash
yarn jest --config x-pack/plugins/cloud_security_posture/jest.config.js
```

To run a specific test, you can use the `--testNamePattern` flag:
```bash
yarn jest --config x-pack/plugins/cloud_security_posture/jest.config.js --testNamePattern=FilePattern -t MyTest
```

### Running integration tests
The cloud security posture plugin has also integration tests that run against a real Elasticsearch and Kibana instances.
We use these tests to verify that the plugin works as expected when running in a real environment.
In order to run the integration tests, you need to have a running Elasticsearch and Kibana instances with the integration test configuration.

You can run Kibana and Elastic with the integration test configuration by running the following command from the root of the Kibana repository:

```bash
node scripts/functional_tests_server.js --config x-pack/test/api_integration/config.ts
```
You should wait until the server is ready to accept connections before running the integration tests.

Then, in a separate terminal,we will run the integration test.
In order to do so, run the following command:

``` bash  
node scripts/functional_test_runner.js --config x-pack/test/api_integration/config.ts --include=test_file_path
```

## Code guidelines
### Preface
This document outlines some high-level principles/guidelines for development in the CSP Control Plane team. It does not replace Kibana’s guidelines, it builds on top of them with some emphasis for our team and the way we aspire to work. Here are some references to Kibana’s dev documentation for more detailed and practical information:

- [Kibana dev docs - Developer principles](https://docs.elastic.dev/kibana-dev-docs/contributing/dev-principles)
- [Kibana dev docs - Standards and guidelines](https://docs.elastic.dev/kibana-dev-docs/standards)
- [Kibana dev docs - Best Practices](https://docs.elastic.dev/kibana-dev-docs/contributing/best-practices)
- [Kibana dev docs - Style guide](https://docs.elastic.dev/kibana-dev-docs/contributing/styleguide)
- [Kibana-team docs - Conventions](https://github.com/elastic/kibana/blob/main/src/core/CONVENTIONS.md)

### Core principles
#### It needs to work (...as expected)
Every code change should work according to the product/technical spec, and should not break existing functionality.

##### Practical implications
- Code in the `HEAD` of `main` branch should always be stable and in a working state.
- Backwards compatibility should be taken into consideration with every potentially-breaking change.
- Incomplete changes, or changes that rely on fake data, should not be exposed to users, and should be hidden behind an internal code-level feature flag.
- Different UI states (e.g. loading, error) should be properly handled. Error paths in the server should have detailed logs (see [Error cases are features](https://docs.elastic.dev/kibana-dev-docs/contributing/dev-principles#error-cases-are-features) for additional information).

#### It needs to be well tested (...manually and automatically)
Every code change should have automatic tests that cover as much functionality as possible. In addition, changes should be thoroughly verified manually.

##### Practical implications
- Unit tests should be added for every new/changed functionality, trivial as it may be.
- In the future, integration and E2E tests should also be utilized.
- Tests code coverage should be as close to 100% as possible.
- Changes should be thoroughly tested manually, including different states and edge cases.
- Code reviewers should also manually verify that code changes work as expected by checking out the code and playing with it by themselves.


#### It needs to be maintainable (...readable and as simple as possible)
Every code change should be written with a maintainability mindset. Readability, simplicity, and documentation are the key for maintainable code. Remember that code is read many more times than it is written. We are building for the long run, and maintainable code will allow us to keep a high development velocity as the team grows and new people start working on our code.

##### Practical implications
- Naming of variables, methods, modules, etc. should be descriptive and as clear as possible.
- New code should be highly consistent with existing code, both with our own code and with general Kibana code. This applies to style, patterns, etc.
- Comments are not a replacement for readable code. That being said, “why” comments should be used when complexity is inherent, and documentation comments should be used for public-facing code.
- When possible, code should be split into smaller digestible parts.
- Premature optimizations should not be made if they trade-off readability or simplicity of the code.