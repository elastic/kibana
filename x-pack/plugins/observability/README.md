# Observability plugin

This plugin provides shared components and services for use across observability solutions, as well as the observability landing page UI.

## Rules, Alerts, and Cases

The Observability plugin contains experimental support for improved alerting and
case management.

If you have:

```yaml
xpack.observability.unsafe.cases.enabled: true
```

In your Kibana configuration, the Cases page will be available.

If you have:

```yaml
xpack.observability.unsafe.alertingExperience.enabled: true
```

In your Kibana configuration, the Alerts page will be available.

This will only enable the UI for this page when. In order to have alert data indexed
you'll need to enable writing in the [Rule Registry plugin](../rule_registry/README.md):

```yaml
xpack.ruleRegistry.write.enabled: true
```

When both of the these are set to `true`, your alerts should show on the alerts page.

## Shared navigation

The Observability plugin maintains a navigation registry for Observability solutions, and exposes a shared page template component. Please refer to the docs in [the component directory](public/components/shared/page_template) for more information on registering your solution's navigation structure, and rendering the navigation via the shared component.

## Exploratory view component
A shared component for visualizing observability data types via lens embeddable. [For further details.](./public/components/shared/exploratory_view/README.md)

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

## API integration testing

API tests are separated in two suites:

- a basic license test suite
- a trial license test suite (the equivalent of gold+)

This requires separate test servers and test runners.

### Basic

```
# Start server
node scripts/functional_tests_server --config x-pack/test/observability_api_integration/basic/config.ts

# Run tests
node scripts/functional_test_runner --config x-pack/test/observability_api_integration/basic/config.ts
```

The API tests for "basic" are located in `x-pack/test/observability_api_integration/basic/tests`.

### Trial

```
# Start server
node scripts/functional_tests_server --config x-pack/test/observability_api_integration/trial/config.ts

# Run tests
node scripts/functional_test_runner --config x-pack/test/observability_api_integration/trial/config.ts
```

The API tests for "trial" are located in `x-pack/test/observability_api_integration/trial/tests`.

### API test tips

- For debugging access Elasticsearch on http://localhost:9220` (elastic/changeme)
- To update snapshots append `--updateSnapshots` to the functional_test_runner command
