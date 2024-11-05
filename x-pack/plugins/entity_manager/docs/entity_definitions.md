### Entity Definitions

Entity definitions are a core concept of the entity model. They define the way to locate, aggregate and extract a specific type of entity documents from source indices. Definitions are stored as Kibana saved objects and serve as the input to build ingested pipelines, index templates and transforms that will collect and store the data.

#### How a definition works

> [!NOTE]
> Entity definitions are based on transform and as such a subset of the configuration is tightly coupled to transform settings. While we provide defaults for these settings, one can still update properties such as `frequency`, `sync.time.delay` and `sync.time.field` (see [transform documentation](https://www.elastic.co/guide/en/elasticsearch/reference/current/put-transform.html)).

When creating a definition (see [entity definition schema](https://github.com/elastic/kibana/blob/main/x-pack/packages/kbn-entities-schema/src/schema/entity_definition.ts#L21)), entity manager will create a transforms to collect entities based on the configured [identityFields](https://github.com/elastic/kibana/blob/main/x-pack/packages/kbn-entities-schema/src/schema/entity_definition.ts#L29).
The transform creates one document per entity, reading documents from the configured source indices and grouping them by the identity fields. Each entity document gets overwritten each time the transform runs.

The transforms outputs the data to a unique index (`.entities.v1.latest.<definition-id>`).
For convenience we create type-based aliases on top on these indices, where the type is extracted from the `entityDefinition.type` property. For a definition of `type: service`, the data can be read through the `entities-service-history` and `entities-service-latest` aliases.

#### Iterating on a definition

One can create a definition with a request to `POST kbn:/internal/entities/definition`, or through the [entity client](../server/lib/entity_client.ts).

When creating the definition, there are 3 main pieces to consider:
1. The core entity discovery settings
2. The metadata to collect for each entity that is identified
3. The metrics to compute for each entity that is identified

Let's look at the most basic example, one that only discovers entities.

```json
{
  "id": "my_hosts",
  "name": "Hosts from logs data",
  "description": "This definition extracts host entities from log data",
  "version": "1.0.0",
  "type": "host",
  "indexPatterns": ["logs-*"],
  "identityFields": ["host.name"],
  "displayNameTemplate": "{{host.name}}",
  "history": {
    "timestampField": "@timestamp",
    "interval": "2m",
    "settings": {
        "frequency": "2m"
    }
  }
}
```

This definition will look inside the `logs-*` index pattern for documents that container the field `host.name` and group them based on that value to create the entities. It will run the discovery every 2 minutes.
The documents will be of type "host" so they can be queried via `entities-host-history` or `entities-host-latest`. Beyond the basic `entity` fields, each entity document will also contain all the identify fields at the root of the document, this it is easy to find your hosts by filtering by `host.name`. Note that it is not necessary to add the `identifyFields` as metadata as these will be automatically collected in the output documents.

An entity document for this definition will look like below.

History:
```json
{
  "host": {
    "name": "gke-edge-oblt-edge-oblt-pool-8fc2868f-jf56"
  },
  "@timestamp": "2024-09-10T12:36:00.000Z",
  "event": {
    "ingested": "2024-09-10T13:06:54.211210797Z"
  },
  "entity": {
    "lastSeenTimestamp": "2024-09-10T12:37:59.334Z",
    "identityFields": [
      "host.name"
    ],
    "id": "X/FDBqGTvfnAAHTrv6XfzQ==",
    "definitionId": "my_hosts",
    "definitionVersion": "1.0.0",
    "schemaVersion": "v1",
    "type": "host"
  }
}
```

Latest:
```json
{
  "event": {
    "ingested": "2024-09-10T13:07:19.042735184Z"
  },
  "host": {
    "name": "gke-edge-oblt-edge-oblt-pool-8fc2868f-lgmr"
  },
  "entity": {
    "firstSeenTimestamp": "2024-09-10T12:06:00.000Z",
    "lastSeenTimestamp": "2024-09-10T13:03:59.432Z",
    "id": "0j+khoOmcrluI7nhYSVnCw==",
    "displayName": "gke-edge-oblt-edge-oblt-pool-8fc2868f-lgmr",
    "definitionId": "my_hosts",
    "definitionVersion": "1.0.0",
    "identityFields": [
      "host.name"
    ],
    "type": "host",
    "schemaVersion": "v1"
  }
}
```

Let's extend our definition by adding some metadata and a metric to compute. We can do this by issuing a request to `PATCH kbn:/internal/entities/definition/my_hosts` with the following body:

```json
{
  "version": "1.1.0",
  "metadata": [
    "cloud.provider"
  ],
  "metrics": [
    {
      "name": "cpu_usage_avg",
      "equation": "A",
      "metrics": [
        {
          "name": "A",
          "aggregation": "avg",
          "field": "system.cpu.total.norm.pct"
        }
      ]
    }
  ]
}
```

Once that is done, we can view how the shape of the entity documents change.

History:
```json
{
  "cloud": {
    "provider": [
      "gcp"
    ]
  },
  "host": {
    "name": "opbeans-go-nsn-7f8749688-qfw4t"
  },
  "@timestamp": "2024-09-10T12:58:00.000Z",
  "event": {
    "ingested": "2024-09-10T13:28:50.505448228Z"
  },
  "entity": {
    "lastSeenTimestamp": "2024-09-10T12:59:57.501Z",
    "schemaVersion": "v1",
    "definitionVersion": "1.1.0",
    "identityFields": [
      "host.name"
    ],
    "metrics": {
      "log_rate": 183
    },
    "id": "8yUkkMImEDcbgXmMIm7rkA==",
    "type": "host",
    "definitionId": "my_hosts"
  }
}
}
```

Latest:
```json
{
  "cloud": {
    "provider": [
      "gcp"
    ]
  },
  "host": {
    "name": "opbeans-go-nsn-7f8749688-qfw4t"
  },
  "event": {
    "ingested": "2024-09-10T13:29:15.028655880Z"
  },
  "entity": {
    "lastSeenTimestamp": "2024-09-10T13:25:59.278Z",
    "schemaVersion": "v1",
    "definitionVersion": "1.1.0",
    "displayName": "opbeans-go-nsn-7f8749688-qfw4t",
    "identityFields": [
      "host.name"
    ],
    "id": "8yUkkMImEDcbgXmMIm7rkA==",
    "metrics": {
      "log_rate": 203
    },
    "type": "host",
    "firstSeenTimestamp": "2024-09-10T12:06:00.000Z",
    "definitionId": "my_hosts"
  }
}
```

The key additions to notice are:
1. The new root field `cloud.provider`
2. The new metric field `entity.metrics.log_rate`

Through this iterative process you can craft a definition to meet your needs, verifying along the way that the data is captured as you expect.
In case the data is not captured correctly, a common cause is due to the exact timings of the two transforms.
If the history transform is lagging behind, then the latest transform will not have any data in its lookback window to capture.

**Entity definition examples**:

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
    "service.name",
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
