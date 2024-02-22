# Custom threshold rule

Custom threshold rule is GA since 8.13.

## Development & testing

### With data forge

> [!TIP]
> The following commands uses [kbn-data-forge](../../../../packages/kbn-data-forge/README.md) to generate some data for testing Custom threshold rule.

Basic command to generate host data for 7 hosts:
```sh
node x-pack/scripts/data_forge.js \
  --events-per-cycle 7 \
  --lookback now-20m \
  --install-kibana-assets \
  --dataset fake_hosts
```

Get help with the data forge tool: `node x-pack/scripts/data_forge.js --help`

#### Create a Custom threshold rule

- First create a data view as shown below:

  <img src="./images/data_forge_data_view.png" width="800"/>

- Then you can adjust the rule to alert based on CPU usage:

  <img src="./images/data_forge_custom_threshold_rule_cpu.png" width="500"/>

### With synthtrace

> [!TIP]
> The following commands uses [kbn-apm-synthtrace](../../../../packages/kbn-apm-synthtrace) to generate some data for testing Custom threshold rule.

Basic command to generate APM data for 3 services:
```sh
node scripts/synthtrace simple_trace.ts --local --live
```

#### Create a Custom threshold rule

- First create a data view as shown below:

  <img src="./images/synthtrace_data_view.png" width="800"/>

- Then you can adjust the rule to alert based on CPU usage:

  <img src="./images/synthtrace_custom_threshold_rule.png" width="500"/>
