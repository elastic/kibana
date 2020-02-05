# Ingest Manager

## Getting started
See the Kibana docs for [how to set up your dev environment](https://github.com/elastic/kibana/blob/master/CONTRIBUTING.md#setting-up-your-development-environment), [run Elasticsearch](https://github.com/elastic/kibana/blob/master/CONTRIBUTING.md#running-elasticsearch), and [start Kibana](https://github.com/elastic/kibana/blob/master/CONTRIBUTING.md#running-kibana).

One common workflow is:

 1. `yarn es snapshot`
 1. In another shell: `yarn start`

## API Tests
### Automated tests (pending)
API integrations tests (under `x-pack/test`) are pending. For now you can watch the videos demonstrating the plugin in the different states or 

### Manual tests
#### Default config (plugin disabled)

```bash
yarn es snapshot ## terminal 1
source scripts/config_default.sh ## terminal 2
source scripts/test_default.sh ## terminal 3
```
<details>
<summary><code>source scripts/test_default.sh</code></summary>

```bash
SHOULD 404 on get agent configs
{"statusCode":404,"error":"Not Found","message":"Not Found"}

SHOULD 404 on create agent config
{"statusCode":404,"error":"Not Found","message":"Not Found"}

SHOULD 404 on get datasources
{"statusCode":404,"error":"Not Found","message":"Not Found"}

SHOULD 404 on create datasource
{"statusCode":404,"error":"Not Found","message":"Not Found"}

SHOULD 404 on EPM package api
{"statusCode":404,"error":"Not Found","message":"Not Found"}
```
</details>

#### Plugin enabled

```bash
yarn es snapshot ## terminal 1
source scripts/config_ingest_only.sh ## terminal 2
source scripts/test_ingest_only.sh ## terminal 3
```

<details><summary><code>source scripts/test_ingest_only.sh</code></summary>

```bash
SHOULD get agent configs
{"items":[],"total":0,"page":1,"perPage":20,"success":true}

SHOULD create agent config
{"item":{"id":"16e83710-4867-11ea-8196-2d1d992542fe","name":"NAME","description":"DESCRIPTION","namespace":"NAMESPACE","updated_on":"2020-02-05T22:30:19.137Z","updated_by":"system"},"success":true}

SHOULD have new agent config
{"items":[{"id":"16e83710-4867-11ea-8196-2d1d992542fe","name":"NAME","description":"DESCRIPTION","namespace":"NAMESPACE","updated_on":"2020-02-05T22:30:19.137Z","updated_by":"system"}],"total":1,"page":1,"perPage":20,"success":true}

SHOULD get datasources
{"items":[],"total":0,"page":1,"perPage":20,"success":true}

SHOULD create datasource
{"item":{"id":"177b0130-4867-11ea-8196-2d1d992542fe","name":"name string","agent_config_id":"some id string","package":{"name":"endpoint","version":"1.0.1","description":"Description about Endpoint package","title":"Endpoint Security","assets":[{"id":"string","type":"index-template"}]},"streams":[{"input":{"type":"etc","config":{"paths":"/var/log/*.log"},"ingest_pipelines":["string"],"index_template":"string","ilm_policy":"string","fields":[{}]},"config":{"metricsets":["container","cpu"]},"output_id":"default","processors":["string"]}],"read_alias":"string"},"success":true}

SHOULD 404 from EPM package api
{"statusCode":404,"error":"Not Found","message":"Not Found"}
```
</details>

## Plugin architecture
Follows the `common`, `server`, `public` structure from the [Architecture Style Guide
](https://github.com/elastic/kibana/blob/master/style_guides/architecture_style_guide.md#file-and-folder-structure).

We use New Platform approach (structure, APIs, etc) where possible. There's a `kibana.json` manifest, and the server uses the `server/{index,plugin}.ts` approach from [`MIGRATION.md`](https://github.com/elastic/kibana/blob/master/src/core/MIGRATION.md#architecture). 