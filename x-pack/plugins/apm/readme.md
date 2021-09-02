# Documentation for APM UI developers

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

## Testing

Go to [tests documentation](./scripts/test/README.md)

## Linting

_Note: Run the following commands from `kibana/`._

### Typescript

```
node scripts/type_check.js --project x-pack/plugins/apm/tsconfig.json
```

### Prettier

```
yarn prettier  "./x-pack/plugins/apm/**/*.{tsx,ts,js}" --write
```

### ESLint

```
node scripts/eslint.js x-pack/legacy/plugins/apm
```

## Setup default APM users

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

## Storybook

Start the [Storybook](https://storybook.js.org/) development environment with
`yarn storybook apm`. All files with a .stories.tsx extension will be loaded.
You can access the development environment at http://localhost:9001.

## Experimental features settings

To set up a flagged feature, add the name of the feature key (`apm:myFeature`) to [commmon/ui_settings_keys.ts](./common/ui_settings_keys.ts) and the feature parameters to [server/ui_settings.ts](./server/ui_settings.ts).

Test for the feature like:

```js
import { myFeatureEnabled } from '../ui_settings_keys';
if (core.uiSettings.get(myFeatureEnabled)) {
  doStuff();
}
```

Settings can be managed in Kibana under Stack Management > Advanced Settings > Observability.

## Further resources

- [Cypress integration tests](./e2e/README.md)
- [VSCode setup instructions](./dev_docs/vscode_setup.md)
- [Github PR commands](./dev_docs/github_commands.md)
- [Routing and Linking](./dev_docs/routing_and_linking.md)
- [Telemetry](./dev_docs/telemetry.md)
