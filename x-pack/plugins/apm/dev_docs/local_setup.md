# Start Kibana

```
git clone git@github.com:elastic/kibana.git
cd kibana/
yarn kbn bootstrap
yarn start
```

# Elasticsearch, APM Server and data generators

To access an Elasticsearch instance that has live data you have three options:

## 1. Using Synthtrace

**Start Elasticsearch**
```
yarn es snapshot
```

**Create APM mappings**

```
node ./scripts/es_archiver load "x-pack/plugins/apm/ftr_e2e/cypress/fixtures/es_archiver/apm_mappings_only_8.0.0" --es-url=http://system_indices_superuser:changeme@localhost:9200 --kibana-url=http://elastic:changeme@localhost:5601 --config=./test/functional/config.js
```

*Note: Elasticsearch must be available before running the above command*


**Run Synthtrace**
```
node packages/elastic-apm-synthtrace/src/scripts/run packages/elastic-apm-synthtrace/src/scripts/examples/01_simple_trace.ts --target=http://elastic:changeme@localhost:9200
```

Documentation for [Synthtrace](https://github.com/elastic/kibana/blob/main/packages/elastic-apm-synthtrace/README.md)

## 2. Cloud-based ES Cluster (internal devs only)

Use the [oblt-cli](https://github.com/elastic/observability-test-environments/blob/master/tools/oblt_cli/README.md) to connect to a cloud-based ES cluster.

## 3. Local ES Cluster

### Start Elasticsearch and APM data generators
_Docker Compose is required_
```
git clone git@github.com:elastic/apm-integration-testing.git
cd apm-integration-testing/
./scripts/compose.py start master --all --no-kibana
```

### Connect Kibana to Elasticsearch

Update `config/kibana.dev.yml` with:

```yml
elasticsearch.hosts: http://localhost:9200
elasticsearch.username: admin
elasticsearch.password: changeme
```

# Setup default APM users

APM behaves differently depending on which the role and permissions a logged in user has. To create the users run:

```sh
node x-pack/plugins/apm/scripts/create_apm_users_and_roles.js --username admin --password changeme --kibana-url http://localhost:5601 --role-suffix <github-username-or-something-unique>
```

This will create:

 - **apm_read_user**: Read only user
 - **apm_power_user**: Read+write user.

# Debugging Elasticsearch queries

All APM api endpoints accept `_inspect=true` as a query param that will output all Elasticsearch queries performed in that request. It will be available in the browser response and on localhost it is also available in the Kibana Node.js process output.

Example:
`/internal/apm/services/my_service?_inspect=true`
