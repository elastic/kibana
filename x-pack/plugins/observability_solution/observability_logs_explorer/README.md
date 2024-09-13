# Observability Logs Explorer

This plugin provides an app based on the `LogsExplorer` component from the `logs_explorer` plugin, but adds observability-specific affordances.

## Testing

### Stateful

#### FTR Server
```
yarn test:ftr:server --config ./x-pack/test/functional/apps/observability_logs_explorer/config.ts
```

#### FTR Runner
```
yarn test:ftr:runner --config ./x-pack/test/functional/apps/observability_logs_explorer/config.ts --include ./x-pack/test/functional/apps/observability_logs_explorer/index.ts
```

#### Running Individual Tests
```
yarn test:ftr:runner --config ./x-pack/test/functional/apps/observability_logs_explorer/config.ts --include ./x-pack/test/functional/apps/observability_logs_explorer/$1
```

### Serverless

#### Server
```
yarn test:ftr:server --config ./x-pack/test_serverless/functional/test_suites/observability/config.ts
```

#### Runner
```
yarn test:ftr:runner --config ./x-pack/test_serverless/functional/test_suites/observability/config.ts --include ./x-pack/test_serverless/functional/test_suites/observability/observability_logs_explorer/index.ts
```
#### Running Individual Tests
```
yarn test:ftr:runner --config ./x-pack/test_serverless/functional/test_suites/observability/config.ts --include ./x-pack/test_serverless/functional/test_suites/observability/observability_logs_explorer/$1
```

### Using dockerized package registry

For tests using package registry we have enabled a configuration that uses a dockerized lite version to execute the tests in the CI, this will reduce the flakyness of them when calling the real endpoint.

To be able to run this version locally you must have a docker daemon running in your system and set `FLEET_PACKAGE_REGISTRY_PORT` env var. In order to set this variable execute

```
export set FLEET_PACKAGE_REGISTRY_PORT=12345
```

To unset the variable, and run the tests against the real endpoint again, execute

```
unset FLEET_PACKAGE_REGISTRY_PORT 
```

## Checktypes

#### Logs Explorer
```
node scripts/type_check.js --project x-pack/plugins/observability_solution/logs_explorer/tsconfig.json
```
#### Observability Logs Explorer
```
node scripts/type_check.js --project x-pack/plugins/observability_solution/observability_logs_explorer/tsconfig.json
```

### Generating Data using Synthtrace

#### Logs Data only
```
node scripts/synthtrace simple_logs.ts --clean [--live]
```

#### Logs and Metrics Data
```
node scripts/synthtrace logs_and_metrics.ts --clean [--live]
```

### General Issues

#### Kibana CI broken due to `kbn/optimiser` issue ?

The limit is done to protect us in case we add some dependency that heavily impacts the bundle size, so this is not to be intended as a fix, but as a conscious update after double-checking the bundle size increase and see if it can be reduced

```
node scripts/build_kibana_platform_plugins --focus logsExplorer --update-limits
```