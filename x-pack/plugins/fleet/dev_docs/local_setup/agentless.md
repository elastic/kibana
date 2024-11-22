# Testing agentless integrations

Integrations have two possible deployment modes:
* on user-managed agents (most cases)
* on internally managed agents: these are called agentless

## Kibana config

Agentless integrations are available in ESS and Serverless, so in order to test or develop these in a local environment, the config should emulate either of these.

At the time of writing, this can be achieved by adding the following to your `kibana.dev.yml`:
```
# Emulate cloud
xpack.cloud.id: "123456789"

# Enable agentless experimental feature flag in Fleet
xpack.fleet.enableExperimental: ['agentless']
# Agentless Fleet config
xpack.fleet.agentless.enabled: true
xpack.fleet.agentless.api.url: 'https://api.agentless.url/api/v1/ess'
xpack.fleet.agentless.api.tls.certificate: './config/node.crt'
xpack.fleet.agentless.api.tls.key: './config/node.key'
xpack.fleet.agentless.api.tls.ca: './config/ca.crt'
```

## Which integrations to test with?

At the time of writing, the Elastic Connectors integration is [agentless only](https://github.com/elastic/integrations/blob/2ebdf0cada6faed352e71a82cf71487672f27bf2/packages/elastic_connectors/manifest.yml#L35-L39) and the Cloud Security Posture Management (CSPM) integration offers both agent-based and agentless deployment modes. These are still in technical preview, so "Display beta integrations" should be checked.
