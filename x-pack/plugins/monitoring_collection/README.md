# Monitoring Collection

## Plugin

This plugin allows for other plugins to add data to Kibana stack monitoring documents.

## OpenTelemetry Metrics

### Enable Prometheus endpoint with Elastic Agent Prometheus input

1. Start [local setup with fleet](../fleet/README.md#running-fleet-server-locally-in-a-container) or a cloud cluster
2. Start Kibana
3. Set up a new agent policy and enroll a new agent in your local machine
4. Install the Prometheus Metrics package
   1. Set **Hosts** with `localhost:5601`
   2. Set **Metrics Path** with `/(BASEPATH)/api/monitoring_collection/v1/prometheus`
   3. Remove the values from **Bearer Token File** and **SSL Certificate Authorities**
   4. Set **Username** and **Password** with `elastic` and `changeme`
5. Add the following configuration to `kibana.dev.yml`

    ```yml
    # Enable the prometheus exporter
    monitoring_collection.opentelemetry.metrics:
      prometheus.enabled: true
    ```

### Enable OpenTelemetry Metrics API exported as OpenTelemetry Protocol over GRPC

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

You can also provide headers for OTLP endpoints that require authentication:

```yml
# Enable the OTLP exporter to an authenticated APM endpoint
monitoring_collection.opentelemetry.metrics:
  otlp:
    url: "https://DEPLOYMENT.apm.REGION.PROVIDER.elastic-cloud.com"
    headers:
      Authorization: "Bearer SECRET_TOKEN"
```

Alternatively, OTLP Exporter can be configured using environment variables `OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT` and `OTEL_EXPORTER_OTLP_METRICS_HEADERS`. [See OTLP Exporter docs](https://opentelemetry.io/docs/reference/specification/protocol/exporter/) for details.

It's possible to configure logging for the OTLP integration. If not informed, the default will be `info`

```yml
monitoring_collection.opentelemetry.metrics:
  logLevel: warn | info | debug | warn | none | verbose | all
```

For connection-level debug information you can set these variables:

```bash
export GRPC_NODE_TRACE="xds_client,xds_resolver,cds_balancer,eds_balancer,priority,weighted_target,round_robin,resolving_load_balancer,subchannel,keepalive,dns_resolver,fault_injection,http_filter,csds"
export GRPC_NODE_VERBOSITY=DEBUG
```

See the [grpc-node docs](https://github.com/grpc/grpc-node/blob/master/doc/environment_variables.md) for details and other settings.

### Example of how to instrument the code

* First, we need to define what metrics we want to instrument with OpenTelemetry

  ```ts
  import { Counter, Meter } from '@opentelemetry/api-metrics';

  export class FooApiMeters {
    requestCount: Counter;

    constructor(meter: Meter) {
      this.requestCount = meter.createCounter('request_count', {
        description: 'Counts total number of requests',
      });
    }
  }
  ```

  In this example we're using a `Counter` metric, but [OpenTelemetry SDK](https://open-telemetry.github.io/opentelemetry-js/interfaces/_opentelemetry_api_metrics.Meter.html) provides there are other options to record metrics

* Initialize meter in the plugin setup and pass it to the relevant components that will be instrumented. In this case, we want to instrument `FooApi` routes.

  ```ts
  import { IRouter } from '@kbn/core/server';
  import { FooApiMeters } from './foo_api_meters';
  import { metrics } from '@opentelemetry/api-metrics';

  export class FooApiPlugin implements Plugin {
    private metrics: Metrics;
    private libs: { router: IRouter, metrics: FooApiMeters};

    constructor() {
      this.metrics = new Metrics(metrics.getMeter('kibana.fooApi'));
    }

    public setup(core: CoreSetup) {
      const router = core.http.createRouter();

      this.libs = {
        router,
        metrics: this.metrics
      }

      initMetricsAPIRoute(this.libs);
    }
  }
  ```

  `monitoring_collection` plugins has to be initialized before the plugin that will be instrumented. If for some reason the instrumentation doesn't record any metrics, make sure `monitoring_collection` is included in the list of `requiredPlugins`. e.g:

  ```json
  "requiredPlugins": [
    "monitoringCollection"
  ],
  ```

* Lastly we can use the `metrics` object to instrument the code

  ```ts
  export const initMetricsAPIRoute = (libs: { router: IRouter, metrics: FooApiMeters}) => {
    router.get(
      {
        path: '/api/foo',
        validate: {},
      },
      async function (_context, _req, res) {
        metrics.requestCount.add(1);
        return res.ok({});
      }
    );
  ```