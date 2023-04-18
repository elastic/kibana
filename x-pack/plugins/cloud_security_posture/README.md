# Cloud Security Posture Kibana Plugin

Cloud Posture automates the identification and remediation of risks across cloud infrastructures

---

## Development

read [Kibana Contributing Guide](https://github.com/elastic/kibana/blob/main/CONTRIBUTING.md) for more details

## Testing

for general guidelines, read [Kibana Testing Guide](https://www.elastic.co/guide/en/kibana/current/development-tests.html) for more details

### Tests

1. Unit Tests (Jest) - located in sibling files to the source code
2. [Integration Tests](../../test/api_integration/apis/cloud_security_posture/index.ts)
3. [End-to-End Tests](../../test/cloud_security_posture_functional/pages/index.ts)

### Tools

Run **TypeScript**:

```bash
node scripts/type_check.js --project=x-pack/plugins/cloud_security_posture/tsconfig.json
```

Run **ESLint**:

```bash
yarn lint:es x-pack/plugins/cloud_security_posture
```

Run [**Unit Tests**](https://www.elastic.co/guide/en/kibana/current/development-tests.html#_unit_testing):

```bash
yarn test:jest --config x-pack/plugins/cloud_security_posture/jest.config.js
```

> **Note**
> for a coverage report, add the `--coverage` flag, and run `open target/kibana-coverage/jest/x-pack/plugins/cloud_security_posture/index.html`

Run [**Integration Tests**](https://docs.elastic.dev/kibana-dev-docs/tutorials/testing-plugins#):

```bash
yarn test:ftr --config x-pack/test/api_integration/config.ts
```

Run [**End-to-End Tests**](https://www.elastic.co/guide/en/kibana/current/development-tests.html#_running_functional_tests):

```bash
yarn test:ftr --config x-pack/test/cloud_security_posture_functional/config.ts --debug
```

<br/>

test runner (FTR) can be used separately with `ftr:runner` and `ftr:server`:

```bash
yarn test:ftr:server --config x-pack/test/api_integration/config.ts
yarn test:ftr:runner --include-tag=cloud_security_posture --config x-pack/test/api_integration/config.ts
```
