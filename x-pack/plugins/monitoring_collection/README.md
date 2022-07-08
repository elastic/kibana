# Monitoring Collection

## Plugin

This plugin allows for other plugins to add data to Kibana stack monitoring documents.

## OpenTelemetry Metrics

TODO: explain how to instrument the code with `@opentelemetry/api-metrics` so that the steps below will work with metrics

### Enable Prometheus endpoint with Elastic Agent Prometheus input

1. Start [local setup with fleet](../fleet/README.md#running-fleet-server-locally-in-a-container) or a cloud cluster
2. Start Kibana
3. Set up a new agent policy and enroll a new agent in your local machine
4. Install the Prometheus Metrics package
  a. Set **Hosts** with `localhost:5601`
  b. Set **Metrics Path** with `/(BASEPATH)/api/monitoring_collection/v1/prometheus`
  c. Remove the values from **Bearer Token File** and **SSL Certificate Authorities**
  d. Set **Username** and **Password** with `elastic` and `changeme`
5. Add the following configuration to `kibana.dev.yml`

    ```yml
    # Enable the prometheus exporter
    monitoring_collection.opentelemetry.metrics:
      prometheus.enabled: true

    ```

6. Set up a rule (I use "Create default rules" in the top "Alerts and rules" menu of Stack Monitoring UI)

### Enable OpenTelemetry Metrics API exported as OpenTelemetry Protocol

1. Start [local setup with fleet](../fleet/README.md#running-fleet-server-locally-in-a-container) or a cloud cluster
2. Start Kibana
3. Set up a new agent policy and enroll a new agent in your local machine
4. Install Elastic APM package listening on `localhost:8200` without authentication
5. Add the following configuration to `kibana.dev.yml`

    ```yml
    # Enable the OTLP exporter
    monitoring_collection.opentelemetry.metrics:
      otlp.url: "http://127.0.0.1:8200"
    ```

6. Set up a rule (I use "Create default rules" in the top "Alerts and rules" menu of Stack Monitoring UI)
