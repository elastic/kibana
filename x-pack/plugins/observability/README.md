# Observability plugin

This plugin provides shared components and services for use across observability solutions, as well as the observability landing page UI.

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
