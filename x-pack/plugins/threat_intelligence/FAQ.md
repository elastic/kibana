# FAQ

### Where can I find the UI for the Threat Intelligence plugin?

Kibana recommends working on a fork of the [elastic/kibana repository](https://github.com/elastic/kibana) (see [here](https://docs.github.com/en/get-started/quickstart/fork-a-repo) to learn about forks).

### How is the Threat Intelligence code loaded in Kibana?

The Threat Intelligence plugin is loaded within the [security_solution](https://github.com/elastic/kibana/tree/main/x-pack/plugins/security_solution) plugin.

### I'm not seeing any data in the Indicators' table

See this [documentation here](https://github.com/elastic/security-team/blob/main/docs/protections-team/threat-intelligence-services/protections-experience/development-setup.mdx) to get Threat Intelligence feed in Kibana.

Once you have the feed running, go to `Management > Advanced Settings > Threat indices` and add `filebeat-*` to the list (comma separated).