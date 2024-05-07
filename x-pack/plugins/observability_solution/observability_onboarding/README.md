# Observability onboarding plugin

This plugin provides an onboarding framework for observability solutions: Logs and APM.

## Stateful onboarding

To run the stateful onboarding flows start Kibana as usual.

## Serverless onboarding

To run the experimental serverless onboarding flows add the following settings to `kibana.dev.yml`:

```yml
xpack.cloud_integrations.experiments.enabled: true
xpack.cloud_integrations.experiments.flag_overrides:
  "observability_onboarding.experimental_onboarding_flow_enabled": true

```

Then start Kibana using `yarn serverless-oblt`.
