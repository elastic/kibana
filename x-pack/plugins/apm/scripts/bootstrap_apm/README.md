# Getting started

A script for creating an elastic stack deployment on a remote cluster using `ecctl` and generating APM data using apm-sythtrace tool.

## Prerequisites for running the script

- [ecctl](https://www.elastic.co/downloads/ecctl) installed
- API key
  - You can generate a key on [staging](https://staging.found.no/deployment-features/keys)
- Make sure you have installed Kibana dependencies

## Configuration

Update the following configuration with your own credentials and store it your home directory `$HOME/.ecctl/config.json`

```
$HOME/.ecctl/config.json

{
  "host": "https://staging.found.no",
  "api_key": "API_KEY",
  "region": "us-west-2",
  "output": "text",
  "timeout": 30000000000,
  "insecure": true
}
```

## Run script

From kibana root

`bash x-pack/plugins/apm/scripts/bootstrap_apm/src/run.sh -n 'apm-bootstrap-with-data'`

The following options are supported:
| Option | Description | Default |
| ------------------| ------------------------------------------------------- | ------------ |
| `-v` | Stack version | `7.17.0`
| `-n` | Deployment name | `performance-apm-cluster`
| `-r` | Region | `gcp-us-central1`
| `-p` | Hardware profile | gcp-cpu-optimized`

The script will try to bootstrap automatically a remote cluster with the following settings and it will use [packages/elastic-apm-synthtrace/src/scripts/examples/01_simple_trace.ts](01_simple_trace.ts) to generate data

| Setting            | Description                                                       | Default                    |
| ------------------ | ----------------------------------------------------------------- | -------------------------- |
| `Host`             | Host of remote cluster                                            | `https://staging.found.no` |
| `Deployment name`  | Host of remote cluster                                            | `performance-apm-cluster`  |
| `Cloud provider`   | Remote cluster cloud provider                                     | `Google Cloud Platform`    |
| `Region`           | Iowa (us-central1)                                                | `gcp-us-central1`          |
| `Hardware profile` | A hardware profile deploys the Elastic Stack on virtual hardware. | `CPU optimized`            |
| `Version`          | Elastic stack version.                                            | `7.17.0` (latest)          |

_Available regions, deployment templates and instance configurations can be found [here](https://www.elastic.co/guide/en/cloud/current/ec-regions-templates-instances.html)_

<!-- TODO 1. pass dynamic synthtrace example -->
