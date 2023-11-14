# Observability Log Explorer

This plugin provides an app based on the `LogExplorer` component from the `log_explorer` plugin, but adds observability-specific affordances.

## Testing

### Stateful

#### FTR Server
```
node scripts/functional_tests_server --config ./x-pack/test/functional/apps/observability_log_explorer/config.ts
```

#### FTR Runner
```
node scripts/functional_test_runner --config ./x-pack/test_serverless/functional/test_suites/observability/config.ts --include ./x-pack/test_serverless/functional/test_suites/observability/observability_log_explorer/index.ts
```

#### Running Individual Tests
```
node scripts/functional_test_runner --config ./x-pack/test_serverless/functional/test_suites/observability/config.ts --include ./x-pack/test_serverless/functional/test_suites/observability/observability_log_explorer/$1
```

### Serverless

#### Server
```
node scripts/functional_tests_server --config ./x-pack/test_serverless/functional/test_suites/observability/config.ts
```

#### Runner
```
node scripts/functional_test_runner --config ./x-pack/test_serverless/functional/test_suites/observability/config.ts --include ./x-pack/test_serverless/functional/test_suites/observability/observability_log_explorer/index.ts
```
#### Running Individual Tests
```
node scripts/functional_test_runner --config ./x-pack/test_serverless/functional/test_suites/observability/config.ts --include ./x-pack/test_serverless/functional/test_suites/observability/observability_log_explorer/$1
```

## Checktypes

#### Log Explorer
```
node scripts/type_check.js --project x-pack/plugins/log_explorer/tsconfig.json
```
#### Observability Log Explorer
```
node scripts/type_check.js --project x-pack/plugins/observability_log_explorer/tsconfig.json
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
```
node scripts/build_kibana_platform_plugins --focus logExplorer --update-limits
```