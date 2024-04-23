# Exploratory View plugin

A shared component for visualizing observability data types via lens embeddable. [For further details.](./public/components/exploratory_view/README.md)

## Unit testing

Note: Run the following commands from `kibana/x-pack/plugins/observability_solution/exploratory_view`.

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
