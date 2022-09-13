# Threat Intelligence

Elastic Threat Intelligence makes it easy to analyze and investigate potential security threats by aggregating data from multiple sources in one place. You’ll be able to view data from all activated threat intelligence feeds and take action.

### Where to find the UI for this plugin?

The Threat Intelligence UI is displayed in Kibana Security, under the Explore section.

## Quick Start

See the [kibana contributing guide](https://github.com/elastic/kibana/blob/main/CONTRIBUTING.md) for instructions setting up your development environment.

Verify your node version [here](https://github.com/elastic/kibana/blob/main/.node-version).

**Run ES:**

`yarn es snapshot --license trial`

**Run Kibana:**

> **Important:**
>
> See here to get your `kibana.yaml` to enable the Threat Intelligence plugin.

```
yarn kbn reset && yarn kbn bootstrap
yarn start --no-base-path
```

### Performance

You can generate large volumes of threat indicators on demand with the following script:

```
node scripts/generate_indicators.js
```

see the file in order to adjust the amount of indicators generated. The default is one million.

### Useful hints

Export local instance data to es_archives (will be loaded in cypress tests).

```
TEST_ES_PORT=9200 node scripts/es_archiver save x-pack/test/threat_intelligence_cypress/es_archives/threat_intelligence "logs-ti*"
```

## FAQ

See [FAQ.md](https://github.com/elastic/kibana/blob/main/x-pack/plugins/threat_intelligence/FAQ.md) for questions you may have.

## Contributing

See [CONTRIBUTING.md](https://github.com/elastic/kibana/blob/main/x-pack/plugins/threat_intelligence/CONTRIBUTING.md) for information on contributing.

## Issues

Please report any issues in [this GitHub project](https://github.com/orgs/elastic/projects/758/).
