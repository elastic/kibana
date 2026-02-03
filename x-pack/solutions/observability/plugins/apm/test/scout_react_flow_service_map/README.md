## React Flow Service Map Tests

This directory contains Scout tests for the React Flow service map implementation.

These tests use a **custom server configuration** that automatically enables the `serviceMapUseReactFlow` feature flag.

### How to run tests

First start the servers with the custom config:

```bash
// ESS (stateful)
node scripts/scout.js start-server --stateful --config-dir react_flow_service_map

// Serverless
node scripts/scout.js start-server --serverless=oblt --config-dir react_flow_service_map
```

Then run the tests in another terminal:

```bash
// ESS (stateful)
npx playwright test --config=x-pack/solutions/observability/plugins/apm/test/scout_react_flow_service_map/ui/parallel.playwright.config.ts --grep=@ess --project=local

// Serverless
npx playwright test --config=x-pack/solutions/observability/plugins/apm/test/scout_react_flow_service_map/ui/parallel.playwright.config.ts --grep=@svlOblt --project=local
```

### Server Configuration

The custom server config is located at:
`src/platform/packages/shared/kbn-scout/src/servers/configs/custom/react_flow_service_map/`

It extends the default config and adds:
```
--feature_flags.overrides.apm.serviceMapUseReactFlow=true
```
