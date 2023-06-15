# Universal Profiling (Beta)

## Overview
Universal Profiling provides fleet-wide, whole-system, continuous profiling with zero instrumentation.

Get a comprehensive understanding of what lines of code are consuming compute resources throughout your entire fleet by visualizing your data in Kibana using the flamegraph, stacktraces, and top functions views.

### Universal profiling setup
When on [Cloud](https://www.elastic.co/cloud/), Universal Profiling is enabled by default. It means that it will be available in Kibana, under the **Observability** menu section. But before you can see data, Universal Profiling needs to be initialized. 

##### **What does initialize Universal Profiling mean?**
It means that you need to manually initialize it by navigating to one of the views and click on the `Set up` button. This triggers some checks and install some packages so data can be sent.

Some of the actions/checks:
- APM integration must be installed and configured.
- Create Universal Profiling indices.
- Install the Collector integration.
- Install the Symbolizer integration.

### Collector integration
TBD

### Symbolizer integration
TBD


## Getting started [dev mode]
### Start Kibana

```
git clone git@github.com:elastic/kibana.git
cd kibana/
yarn kbn bootstrap
yarn start
```

By default universal profiling is **disabled** for non-cloud enviroments. To enable it you must:

### Kibana.yml
```
xpack.profiling.enabled: true
```
You also need to tell kibana where to get Universal Profiling data from and since it is only availabe on Cloud you also need to add a special configuration for that:

**FYI:** These are development settings only, and are needed because the Profiling plugin in ES doesn't support cross-cluster-search at this moment.

### Kibana.yml
```
#Especify where to get data from:
xpack.profiling.elasticsearch.hosts: ES_HOST
xpack.profiling.elasticsearch.username: USER_NAME
xpack.profiling.elasticsearch.password: PASSWORD

#Add cloud instructino:
xpack.cloud.id: 'foo'
```

## Testing (unit, e2e)
### Unit Tests (Jest)

```
node scripts/jest --config x-pack/plugins/profiling/jest.config.js [--watchAll]
```

## E2E Tests (Cypress)
The E2E tests are located in [`x-pack/plugins/profiling/e2e`](./e2e).

Universal Profiling uses [FTR](../../../packages/kbn-test/README.mdx) (functional test runner) and [Cypress](https://www.cypress.io/) to run the e2e tests. The tests are located at `kibana/x-pack/plugins/profiling/e2e/cypress/e2e`.

### Start test server

```
node x-pack/plugins/profiling/scripts/test/e2e --server
```

### Open cypress dashboard

```
node x-pack/plugins/profiling/scripts/test/e2e --open
```

### Run tests in terminal

```
node x-pack/plugins/profiling/scripts/test/e2e --runner
```

### Run like CI

```
node x-pack/plugins/profiling/scripts/test/e2e
```

## Other resources
- [Official Profiling documentation](https://www.elastic.co/observability/universal-profiling)