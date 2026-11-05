# Isomer Gate A-data

An on-demand FTR suite for Gate A-data: our pipeline's `Datatable` must equal Kibana's for the same config and context. It never runs in CI.

For every fixture in [`@kbn/isomer-gate-a`](../../packages/shared/isomer/isomer-gate-a/README.md), it installs the data the panel was captured over (the sample data at the corpus's `now`, and the edge-case index), materializes the panel's as-code config through `POST /api/isomer/materialize` with the captured time range and time zone, and compares the node's source table with Kibana's captured inspector table.

```sh
node scripts/functional_tests_server --config x-pack/platform/test/isomer_gate_a/config.ts
node scripts/functional_test_runner --config x-pack/platform/test/isomer_gate_a/config.ts
```
