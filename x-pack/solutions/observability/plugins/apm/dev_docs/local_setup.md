# Start Kibana

```
git clone git@github.com:elastic/kibana.git
cd kibana/
pnpm kbn bootstrap
pnpm start
```

# Elasticsearch, APM Server and data generators

To access an Elasticsearch instance that has live data you have three options:

## 1. Using Synthtrace

**Start Elasticsearch & Kibana**

Elasticsearch:

```
pnpm es snapshot
```

Kibana:

```
pnpm start
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

Documentation for [Synthtrace](https://github.com/elastic/kibana/blob/main/src/platform/packages/shared/kbn-synthtrace/README.md)

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
node x-pack/solutions/observability/plugins/apm/scripts/create_apm_users.js --username admin --password changeme --kibana-url http://localhost:5601
```

This will create:

- **viewer**: User with `viewer` role (read-only)
- **editor**: User with `editor` role (read/write)

# Debugging Elasticsearch queries

All APM api endpoints accept `_inspect=true` as a query param that will output all Elasticsearch queries performed in that request. It will be available in the browser response and on localhost it is also available in the Kibana Node.js process output.

Example:
`/internal/apm/services/my_service?_inspect=true`


# Testing managed RUM policy recovery

Start the Agentless API with its v2 RUM endpoints, the `RUMConfig` CRD, and mTLS. Point Kibana at that API using the Fleet Agentless settings and enable the APM preview locally:

```yaml
xpack.apm.managedRumEnabled: true
xpack.fleet.agentless.api.url: https://localhost:8443
xpack.fleet.agentless.api.tls.certificate: /path/to/kibana-client.crt
xpack.fleet.agentless.api.tls.key: /path/to/kibana-client.key
xpack.fleet.agentless.api.tls.ca: /path/to/agentless-ca.crt
```

`xpack.fleet.agentless.enabled` is not required. It controls Agentless integrations, not managed RUM.

For ECH deployments pinned to a different Agentless host, set `xpack.fleet.agentless.api.rumUrl` to the direct HTTPS origin (any path is ignored). The RUM client keeps mTLS requests on the configured origin.

Use the default space and a user with APM settings write access in all spaces. Send requests through Kibana’s internal HTTP client, which sets the required headers.

1. Send `PUT /internal/apm/rum` with `{"enabled":true,"allowed_origins":["https://example.org"]}`. Confirm the response contains `"published":true`.
2. Send `POST /internal/apm/rum/client_tokens`. Copy the token from the response. Kibana stores only the digest and token metadata. A response with `"published":false` means the change was saved and Task Manager will retry publication.
3. Delete the target's Kubernetes `RUMConfig` in the local test cluster. Within the next Task Manager interval (one minute), check that Agentless API again returns the same active token ID from `GET /api/v2/rum/client_tokens`.
4. Send `DELETE /internal/apm/rum/client_tokens/{id}` to revoke the token and verify it stays absent after another publish. Send `DELETE /internal/apm/rum` to publish a deletion revision.
