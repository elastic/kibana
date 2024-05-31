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

**Start Elasticsearch & Kibana**

Elasticsearch:

```
yarn es snapshot
```

Kibana:

```
yarn start
```

**Run Synthtrace**

```
node scripts/synthtrace simple_trace.ts --local
```

The `--local` flag is a shortcut to specifying `--target` and `--kibana`. It autodiscovers the current kibana basepath and installs the appropiate APM package.

**Connect Kibana to ES**
Update `config/kibana.dev.yml` with:

```yml
elasticsearch.hosts: http://localhost:9200
elasticsearch.username: kibana_system
elasticsearch.password: changeme
```

Documentation for [Synthtrace](https://github.com/elastic/kibana/blob/main/packages/kbn-apm-synthtrace/README.md)

## 2. Cloud-based ES Cluster (internal devs only)

Use the [oblt-cli](https://github.com/elastic/observability-test-environments/blob/master/tools/oblt_cli/README.md) to connect to a cloud-based ES cluster.

**Run Synthtrace**

If you want to bootstrap some data on a cloud instance you can also use the following

```
node scripts/synthtrace simple_trace.ts --cloudId "myname:<base64string>" --maxDocs 100000
```

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

APM behaves differently depending on which role and permissions a logged in user has. To create APM users run:

```sh
node x-pack/plugins/observability_solution/apm/scripts/create_apm_users.js --username admin --password changeme --kibana-url http://localhost:5601
```

This will create:

- **viewer**: User with `viewer` role (read-only)
- **editor**: User with `editor` role (read/write)

# Debugging Elasticsearch queries

All APM api endpoints accept `_inspect=true` as a query param that will output all Elasticsearch queries performed in that request. It will be available in the browser response and on localhost it is also available in the Kibana Node.js process output.

Example:
`/internal/apm/services/my_service?_inspect=true`
