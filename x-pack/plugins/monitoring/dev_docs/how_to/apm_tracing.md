To get deeper information about the behavior of the stack monitoring application you can configure APM to send trace data an APM server.

The kibana source references a central APM server for use by anyone working at Elastic, or you can send trace data to an APM server you manage yourself.

## For local development

For Elasticians doing local development you can simply export these env vars:

```shell
export ELASTIC_APM_ACTIVE=true
export ELASTIC_APM_ENVIRONMENT="dev-${USER}"
```

And data will be available on the shared APM cluster at (internal) - to be added to https://github.com/elastic/observability-dev/tree/main/docs

## For ESS

Add the settings into the `user_settings_override_yaml` deployment configuration within `kibana.plan.kibana` section as escaped YAML inside JSON.

```json
{
  "user_settings_override_yaml": "elastic.apm.active: true\nelastic.apm.serverUrl: https://<my_apm_endpoint>\nelastic.apm.secretToken: <my_APM_token>\nelastic.apm.globalLabels.deploymentId: <my_deployment_ID>\nelastic.apm.centralConfig: false\nelastic.apm.breakdownMetrics: false\nelastic.apm.transactionSampleRate: 0.1\nelastic.apm.metricsInterval: 120s\nelastic.apm.captureSpanStackTraces: false"
}
```

This is an administrative-only API initially, so you'll need admin access or open a support case to have it configured.

## For ECE or other deployments

For on-premise deployments or developers outside Elastic, you can configure an APM endpoint via `kibana.yml`. Note that at the time of writing this document you can't use `kibana.dev.yml` for these settings due to library load order.

```yaml
elastic.apm.active: true
elastic.apm.serverUrl: https://<my_apm_endpoint>
elastic.apm.secretToken: <my_APM_token>
elastic.apm.globalLabels.deploymentId: <my_deployment_ID>
elastic.apm.centralConfig: false
elastic.apm.breakdownMetrics: false
elastic.apm.transactionSampleRate: 0.1
elastic.apm.metricsInterval: 120s
elastic.apm.captureSpanStackTraces: false
```

When running in ECE you can update `kibana.yml` settings via the ECE web UI under "Edit user setting" for the kibana nodes in the deployment.