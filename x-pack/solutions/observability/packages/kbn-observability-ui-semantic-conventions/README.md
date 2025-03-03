# @kbn/observability-ui-semantic-conventions

Semantic conventions for the Elastic Observability UI.

The constants exported from this package should be used whenever a field name or value is used in any Observability UI code.

The same naming scheme is used as is used in the [`@opentelemetry/semantic-conventions` NPM package](https://github.com/open-telemetry/opentelemetry-js/tree/main/semantic-conventions#opentelemetry-semantic-conventions).

## Usage

```javascript
import {
  METRIC_SYSTEM_PROCESS_CPU_TOTAL_PCT // system.process.cpu.total.pct
} from '@kbn/observability-ui-semantic-conventions';

const aggsForQuery = aggs: {
    cpu: {
        avg: {
            field: METRIC_SYSTEM_PROCESS_CPU_TOTAL_PCT
        }
    }
}
```

Only fields used in the Observability UIs should be exported.

When adding additional fields to be exported, OpenTelemetry semantic conventions should be preferred to their analogs in other schemas.

## Sources

The conventions used here are composed of specifications from these sources:

- [OpenTelemetry Semantic Conventions](https://github.com/open-telemetry/opentelemetry-js/tree/main/semantic-conventions#opentelemetry-semantic-conventions)
- [Elastic Common Schema](https://github.com/elastic/ecs-typescript/?tab=readme-ov-file#elasticecs)
- [Elastic APM events API](https://github.com/elastic/apm-data/tree/main/input/elasticapm/docs/spec)
- [Elastic integration packages](https://github.com/elastic/integrations?tab=readme-ov-file#elastic-integrations) (`apm`, `aws`, `system`, `docker`, `kubernetes`)
- [Profiling events Elasticsearch component template](https://github.com/elastic/elasticsearch/blob/main/x-pack/plugin/core/template-resources/src/main/resources/profiling/component-template/profiling-events.json)
