# Cloud Security Posture Kibana Plugin

Cloud Posture automates the identification and remediation of risks across cloud infrastructures

---

## Development

read [Kibana Contributing Guide](https://github.com/elastic/kibana/blob/main/CONTRIBUTING.md) for more details

## Testing

read [Kibana Testing Guide](https://www.elastic.co/guide/en/kibana/current/development-tests.html) for more details

Run **TypeScript**:

```bash
node scripts/type_check.js --project=x-pack/plugins/cloud_security_posture/tsconfig.json
```

Run **ESLint**:

```bash
yarn lint:es x-pack/plugins/cloud_security_posture
```

Run **Unit Tests**:

```bash
yarn test:jest --config x-pack/plugins/cloud_security_posture/jest.config.js
```

> **Note**
> for a coverage report, add the `--coverage` flag, and run `open target/kibana-coverage/jest/x-pack/plugins/cloud_security_posture/index.html`

Run **API Integration**:

```bash
yarn test:ftr --config x-pack/test/api_integration/config.ts
```

Run **Functional UI Tests**:

```bash
yarn test:ftr --config x-pack/test/cloud_security_posture_functional/config.ts
```

<br/>

> **Note**
> in development, run them separately with `ftr:runner` and `ftr:server`
