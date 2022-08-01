# Getting started

A script for creating an elastic stack deployment on a remote cluster using `ecctl` and generating APM data using [apm-synthtrace](https://github.com/elastic/kibana/tree/main/packages/elastic-apm-synthtrace) tool.

## Prerequisites for running the script

- [ecctl](https://www.elastic.co/downloads/ecctl) installed
- API key
  - You can generate a key on [staging](https://staging.found.no/deployment-features/keys)
- Make sure you have installed Kibana dependencies

## Configuration

If it’s your first time using ecctl, use the `ecctl init` command to assist you in generating a configuration file. The resulting configuration file will be saved under `~/.ecctl/config.json`

or just update the configuration file in `~/.ecctl/config.json` with the following

```
$HOME/.ecctl/config.json

{
  "host": "https://staging.found.no",
  "api_key": "YOUR_STAGING_API_KEY",
  "region": "gcp-us-central1", // gcp-us-central1 only available region in staging
  "output": "text",
  "timeout": 30000000000,
  "insecure": true
}
```

The `output` should be as `text` for `ecctl` in order to access the data correctly and be able to format the response.

## Run script

From kibana root

`bash x-pack/plugins/apm/scripts/bootstrap_apm/src/run.sh -n 'apm-bootstrap-with-data'`

The following options are supported:
| Option | Description | Default |
| ------------------| ------------------------------------------------------- | ------------ |
| `-v` | Stack version | `7.17.0`
| `-n` | Deployment name | `performance-apm-cluster`
| `-r` | Region | `gcp-us-central1`
| `-p` | Hardware profile | `gcp-cpu-optimized`
| `-s` | Data scenario for `apm-synthtrace` | [01_simple_trace.ts](https://github.com/elastic/kibana/tree/main/packages/elastic-apm-synthtrace/src/scripts/examples/01_simple_trace.ts)
| `-o` | Options for `apm-synthtrace` | check the [available options](https://github.com/elastic/kibana/tree/main/packages/elastic-apm-synthtrace#cli)

The script will try to bootstrap automatically a remote cluster with the following settings and it will use the default scenario [01_simple_trace.ts](https://github.com/elastic/kibana/tree/main/packages/elastic-apm-synthtrace/src/scripts/examples/01_simple_trace.ts) to generate the data.

| Setting            | Description                                                       | Default                    |
| ------------------ | ----------------------------------------------------------------- | -------------------------- |
| `Host`             | Host of remote cluster                                            | `https://staging.found.no` |
| `Deployment name`  | Host of remote cluster                                            | `performance-apm-cluster`  |
| `Cloud provider`   | Remote cluster cloud provider                                     | `Google Cloud Platform`    |
| `Region`           | Iowa (us-central1)                                                | `gcp-us-central1`          |
| `Hardware profile` | A hardware profile deploys the Elastic Stack on virtual hardware. | `CPU optimized`            |
| `Version`          | Elastic stack version.                                            | `7.17.0` (latest)          |

_Available regions, deployment templates and instance configurations can be found [here](https://www.elastic.co/guide/en/cloud/current/ec-regions-templates-instances.html)_

For a different scenario pass the option `-s $SCENARIO_NAME`

Here's an example bootraping a cluster with customized `apm-synthtrace` options

`bash x-pack/plugins/apm/scripts/bootstrap_apm/src/run.sh -n apm-live-data v 7.16.3 -s 03_monitoring.ts -o '-o '--workers 3 --clientWorkers 2' `
