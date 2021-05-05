# Observability plugin

This plugin provides shared components and services for use across observability solutions, as well as the observability landing page UI.

## Rules, Alerts, and Cases

The Observability plugin contains experimental support for improved alerting and
case management.

If you have:

```yaml
xpack.observability.unsafe.alertingExperience.enabled: true
```

In your Kibana configuration, the Alerts and Cases pages will be available.

This will only enable the UI for these pages. In order to have alert data indexed
you'll need to enable writing in the [Rule Registry plugin](../rule_registry/README.md):

```yaml
xpack.ruleRegistry.unsafe.write.enabled: true
```

When both of the these are set to `true`, your alerts should show on the alerts page.

## Unit testing

Note: Run the following commands from `kibana/x-pack/plugins/observability`.

### Run unit tests

```bash
npx jest --watch
```

### Update snapshots

```bash
npx jest --updateSnapshot
```

### Coverage

HTML coverage report can be found in target/coverage/jest after tests have run.

```bash
open target/coverage/jest/index.html
```
