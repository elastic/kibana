## Local environment setup

### Kibana

```
git clone git@github.com:elastic/kibana.git
cd kibana/
yarn kbn bootstrap
yarn start --no-base-path
```

### APM Server, Elasticsearch and data

To access an elasticsearch instance that has live data you have two options:

#### A. Connect to Elasticsearch on Cloud (internal devs only)

Find the credentials for the cluster [here](https://github.com/elastic/apm-dev/blob/master/docs/credentials/apm-ui-clusters.md#apmelstcco)

#### B. Start Elastic Stack and APM data generators

```
git clone git@github.com:elastic/apm-integration-testing.git
cd apm-integration-testing/
./scripts/compose.py start master --all --no-kibana
```

_Docker Compose is required_

### Setup default APM users

APM behaves differently depending on which the role and permissions a logged in user has. To create the users run:

```sh
node x-pack/plugins/apm/scripts/create-apm-users-and-roles.js --username admin --password changeme --kibana-url http://localhost:5601 --role-suffix <github-username-or-something-unique>
```

This will create:

**apm_read_user**: Read only user

**apm_power_user**: Read+write user.

## Debugging Elasticsearch queries

All APM api endpoints accept `_inspect=true` as a query param that will result in the underlying ES query being outputted in the Kibana backend process.

Example:
`/api/apm/services/my_service?_inspect=true`
diff --git a/x-pack/plugins/apm/dev_docs/linting.md b/x-pack/plugins/apm/dev_docs/linting.md
