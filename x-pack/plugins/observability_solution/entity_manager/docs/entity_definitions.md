### Entity Definitions

Entity definitions are a core concept of the entity model. They define the way to locate, aggregate and extract a specific type of entity documents from source indices. Definitions are stored as Kibana saved objects and serve as the input to build ingested pipelines, index templates and transforms that will collect and store the data.

#### How a definition works

> [!NOTE]
> Entity definitions are based on transform and as such a subset of the configuration is tightly coupled to transform settings. While we provide defaults for these settings, one can still update properties such as `frequency`, `sync.time.delay` and `sync.time.field` (see [transform documentation](https://www.elastic.co/guide/en/elasticsearch/reference/current/put-transform.html)).

When creating a definition (see [entity definition schema](https://github.com/elastic/kibana/blob/main/x-pack/packages/kbn-entities-schema/src/schema/entity_definition.ts#L21)), entity manager will create two transforms to collect entities based on the configured [identityFields](https://github.com/elastic/kibana/blob/main/x-pack/packages/kbn-entities-schema/src/schema/entity_definition.ts#L29):
- the history transform creates a snapshot of entities over time, reading documents from the configured source indices and grouping them by the identity fields and a date histogram. For a given entity the transform creates at most one document per interval (configured by the `history.settings.interval` setting), with its associated metrics and metadata fields aggregated over that interval. While metrics support [multiple aggregations](https://github.com/elastic/kibana/blob/main/x-pack/packages/kbn-entities-schema/src/schema/common.ts#L13), metadata use a `terms` aggregation (to be expanded by https://github.com/elastic/elastic-entity-model/issues/130). To limit the amount of data processed when created, history transform accepts a `history.settings.lookbackPeriod` that defaults to 1h.
- the summary transform creates one document per entity, reading documents from the history transform output indices. Each entity document gets overwritten over time, updating metadata and metrics with the following rules: metrics get the value of the most recent history document while metadata are aggregated over a computed period that attempts to limit the amount of data it looks at.

The definition allows defining an optional backfill transform. This works on the principle that transforms only capture an immutable snapshot of the data at the time they execute. If data is ingested with delay and falls in a bucket that was already covered by a previous [transform checkpoint](https://www.elastic.co/guide/en/elasticsearch/reference/current/transform-checkpoints.html), the data will never be transformed in the output. Ideally one would sync the transform on the [event.ingested field](https://www.elastic.co/guide/en/elasticsearch/reference/current/transform-checkpoints.html#sync-field-ingest-timestamp) to work with delayed data, when that is not possible or desirable the backfill transform can be a fallback. Backfill transform will output its data to the same history indice, because transform uses deterministic ids for the generated document, it will not create duplicate but instead upsert documents from the initial history transform pass.
To enable the backfill transform set a value to `history.settings.backfillSyncDelay` higher than the `history.settings.syncDelay`. The backfill lookback and frequency can also be configured.

History and summary transforms will output their data to indices where history writes to time-based (monthly) indices (`.entities.v1.history.<definition-id>.<yyyy-MM-dd>`) and summary writes to a unique indice (`.entities.v1.latest.<definition-id>`). For convenience we create type-based aliases on top on these indices, where the type is extracted from the `entityDefinition.type` property. For a definition of `type: service`, the data can be read through the `entities-service-history` and `entities-service-latest` aliases.

**Entity definition example**:

One can create a definition with a `POST kbn:/internal/entities/definition` request, or through the [entity client](../server/lib/entity_client.ts).

Given the `services_from_logs` definition below, the history transform will create one entity document per service per minute (based on `@timestamp` field, granted at least one document exist for a given bucket in the source indices), with the `logRate`, `logErrorRatio` metrics and `data_stream.type`, `sourceIndex` metadata aggregated over one minute.

Note that it is not necessary to add the `identifyFields` as metadata as these will be automatically collected in the output documents, and that it is possible to set `identityFields` as optional.

__service_from_logs definition__
<pre>
{
  "id": "services_from_logs",
  "name": "Extract services from logs",
  "type": "service", // the type of entities extracted
  "filter": "", // kql filter
  "indexPatterns": ["logs-*"],
  /** the field/combination of fields identifying an entity **/
  "identityFields": [
    "service.name", // == { "field": "service.name", "optional": false }
    { "field": "service.environment", "optional": true }
  ],
  "displayNameTemplate": "{{service.name}}{{#service.environment}}:{{.}}{{/service.environment}}", // <a href="https://mustache.github.io/">mustache</a> template
  /**
   * the list of fields to collect and aggregate from the source documents
   */
  "metadata": [
    {
      "source": "_index", // the field name in the source indices documents
      "destination": "sourceIndex", // the field name in the entity documents
      "limit": 10 // see <a href="https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations-bucket-terms-aggregation.html#search-aggregations-bucket-terms-aggregation-size">terms aggregation size</a>
    },
    "data_stream.type" // == { "source": "data_stream.type", "destination": "data_stream.type" }
  ],
  /** metrics to collect */
  "metrics": [
    {
      "name": "logRate",
      "equation": "A",
      "metrics": [
        {
          "aggregation": "doc_count",
          "filter": "log.level: *", // kql filter
          "name": "A"
        }
      ]
    },
    {
      "name": "logErrorRatio",
      "equation": "A / B",
      "metrics": [
        {
          "aggregation": "doc_count",
          "filter": "log.level: error",
          "name": "A"
        },
        {
          "aggregation": "doc_count",
          "filter": "log.level: *",
          "name": "B"
        }
      ]
    }
  ],
  "history": {
    "timestampField": "@timestamp", // used for the lookback filter and date_histogram field
    "interval": "1m", // <a href="https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations-bucket-datehistogram-aggregation.html#fixed_intervals">fixed_interval</a> of the history date histogram
    "settings": {
      "syncField": "@timestamp", // see <a href="https://www.elastic.co/guide/en/elasticsearch/reference/current/put-transform.html">sync.time.field</a>
      "syncDelay": "1m", // see <a href="https://www.elastic.co/guide/en/elasticsearch/reference/current/put-transform.html">sync.time.delay</a>
      "frequency": "1m", // see <a href="https://www.elastic.co/guide/en/elasticsearch/reference/current/put-transform.html">frequency</a>
      "lookbackPeriod": "10m", // added as `timestampField >= now-{lookbackPeriod}` filter to the transform query
      "backfillSyncDelay": "10m", // activates the backfill transform if set
      "backfillLookbackPeriod": "20m",
      "backfillFrequency": "5m",
    }
  },
  "latest": {
    "settings": {
      "syncField": "event.ingested", // summary transform reads from history indices which contain `event.ingested`
      "syncDelay": "1m",
      "frequency": "1m"
  },
  "version": "1.0.0" // semver
}
</pre>

__services_from_logs history entity__
```
{
  "@timestamp": 1725021900000,
  "event": {
    "ingested": "2024-08-30T12:49:57.600784550Z"
  },
  "entity": {
    "lastSeenTimestamp": "2024-08-30T12:45:29.308Z",
    "schemaVersion": "v1",
    "definitionVersion": "1.0.0",
    "identityFields": [
      "service.name",
      "service.environment"
    ],
    "metrics": {
      "logRate": 1,
      "logErrorRatio": 0
    },
    "id": "xFF9jc/wxiHrgidS+PwIgQ==",
    "type": "service",
    "definitionId": "services_from_logs"
  },
  "data_stream": {
    "type": [
      "logs"
    ]
  },
  "sourceIndex": [
    ".ds-logs-apm.app.opbeans_swift-default-2024.09.02-000001"
  ],
  "service": {
    "environment": "default",
    "name": "opbeans-swift"
  }
}
```

__services_from_logs summary entity__
```
{
  "event": {
    "ingested": "2024-08-30T12:50:27.637038362Z"
  },
  "entity": {
    "lastSeenTimestamp": "2024-08-30T12:45:29.308Z",
    "schemaVersion": "v1",
    "definitionVersion": "1.0.0",
    "displayName": "opbeans-swift:default",
    "identityFields": [
      "service.name",
      "service.environment"
    ],
    "id": "xFF9jc/wxiHrgidS+PwIgQ==",
    "metrics": {
      "logRate": 1,
      "logErrorRatio": 0
    },
    "type": "service",
    "firstSeenTimestamp": "2024-08-30T11:51:00.000Z",
    "definitionId": "services_from_definition"
  },
  "data_stream": {
    "type": [
      "logs"
    ]
  },
  "sourceIndex": [
    ".ds-logs-apm.app.opbeans_swift-default-2024.09.02-000001"
  ],
  "service": {
    "environment": "default",
    "name": "opbeans-swift"
  }
}
```


#### Extension
The index templates and ingest pipelines created for a given definition are managed by the Entity manager and should not be directly updated. These components still offer extension points that allow customization of each transform through optional components labelled `<component-name>@platform` and `<component-name>@custom` where the former is targeted towards Elastic solution teams and the latter for end users. `@custom` will take precedence when both are defined.
The extension points allow defining a global component (ie applied to both transforms) with `<definition-id>@custom`, or transform specific components with `<definition-id>-(latest|history)@custom`.

#### Managed definitions

Entity manager stores _builtin_ definitions (in [builtin directory](../server/lib/entities/built_in)) that powers Observability features. These definitions are managed by Elastic. To activate these definitions we currently require an _enablement_ step that will 1. create and store an API key that captures the calling user credentials and 2. install and start all builtin definitions bundled with Kibana. The first step is necessary to manage these definitions on behalf of users: with an API key handy we're able to automatically install new definitions or apply updates to existing definitions shipped with future Kibana versions. Note that this is only required because the system user does not have the read/write index privileges required by the transforms.

Functionally, builtin definitions are similar to custom definitions and share the same schema but one should follow these rules when defining one:
- the definition id [should start with a special prefix](../server/lib/entities/built_in/constants.ts#L8)
- the definition should be `managed: true`
- the definition can only look for data in [these index patterns](../server/lib/entities/built_in/constants.ts#L9)

Once added to [this list](../server/lib/entities/built_in/index.ts#L13), new builtin definitions will be automatically managed when Entity discovery is enabled.
When updating a builtin definition, for example by adding metadata fields or updating metrics, one should increment the definition `version` according to semantic versioning. Entity manager will automatically update existing or install new builtin definitions at startup if Entity discovery is enabled.
