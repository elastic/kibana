# Cloud Security Posture Kibana Plugin

Cloud Posture automates the identification and remediation of risks across cloud infrastructures

---

## Development

Read [Kibana Contributing Guide](https://github.com/elastic/kibana/blob/main/CONTRIBUTING.md) for more details

## Testing

For general guidelines, read [Kibana Testing Guide](https://www.elastic.co/guide/en/kibana/current/development-tests.html) for more details

### Tests

1. Unit Tests (Jest) - located in sibling files to the source code
1. [API Integration Tests](../../test/api_integration/apis/cloud_security_posture/config.ts)
1. [Telemetry Integration Tests](../../test/cloud_security_posture_api/config.ts)
1. [End-to-End Tests](../../test/cloud_security_posture_functional/config.ts)
1. [Serverless API Integration tests](../../test_serverless/api_integration/test_suites/security/config.ts)
1. [Serverless End-to-End Tests](../../test_serverless/functional/test_suites/security/config.ts)


### Tools

Run **TypeScript**:

```bash
node scripts/type_check.js --project=x-pack/plugins/cloud_security_posture/tsconfig.json
```

Run **ESLint**:

```bash
yarn lint:es x-pack/plugins/cloud_security_posture
```

Run **i18n check**:
```bash
node scripts/i18n_check.js
```

> **Note**
>
> i18n should run on project scope as it checks translations files outside of our plugin.
>
> Fixes can be applied using the --fix flag

Run [**Unit Tests**](https://www.elastic.co/guide/en/kibana/current/development-tests.html#_unit_testing):

```bash
yarn test:jest --config x-pack/plugins/cloud_security_posture/jest.config.js
```

> **Note**
>
> for a coverage report, add the `--coverage` flag, and run `open target/kibana-coverage/jest/x-pack/plugins/cloud_security_posture/index.html`

Run [**Integration Tests**](https://docs.elastic.dev/kibana-dev-docs/tutorials/testing-plugins#):

```bash
yarn test:ftr --config x-pack/test/api_integration/config.ts
```

Run [**End-to-End Tests**](https://www.elastic.co/guide/en/kibana/current/development-tests.html#_running_functional_tests):

```bash
yarn test:ftr --config x-pack/test/cloud_security_posture_functional/config.ts
yarn test:ftr --config x-pack/test/api_integration/apis/cloud_security_posture/config.ts
yarn test:ftr --config x-pack/test/cloud_security_posture_api/config.ts
yarn test:ftr --config x-pack/test_serverless/api_integration/test_suites/security/config.ts --include-tag=cloud_security_posture
yarn test:ftr --config x-pack/test_serverless/functional/test_suites/security/config.cloud_security_posture.ts
```

#### Run **FTR tests (integration or e2e) for development**

Functional test runner (FTR) can be used separately with `ftr:runner` and `ftr:server`. This is convenient while developing tests.

For example, 

run ESS (stateful) api integration tests:
```bash
yarn test:ftr:server --config x-pack/test/api_integration/config.ts
yarn test:ftr:runner --config x-pack/test/api_integration/apis/cloud_security_posture/config.ts
```

run ESS (stateful) telemetry integration tests:
```bash
yarn test:ftr:server --config x-pack/test/cloud_security_posture_api/config.ts
yarn test:ftr:runner --config x-pack/test/cloud_security_posture_api/config.ts
```

run ESS (stateful) e2e tests:
```bash
yarn test:ftr:server --config x-pack/test/cloud_security_posture_functional/config.ts
yarn test:ftr:runner --config x-pack/test/cloud_security_posture_functional/config.ts
```

run serverless api integration tests:
```bash
yarn test:ftr:server --config x-pack/test_serverless/api_integration/test_suites/security/config.ts
yarn test:ftr:runner --config x-pack/test_serverless/api_integration/test_suites/security/config.ts --include-tag=cloud_security_posture
```

run serverless e2e tests:
```bash
yarn test:ftr:server --config x-pack/test_serverless/functional/test_suites/security/config.cloud_security_posture.ts
yarn test:ftr:runner ---config x-pack/test_serverless/functional/test_suites/security/config.cloud_security_posture.ts
```