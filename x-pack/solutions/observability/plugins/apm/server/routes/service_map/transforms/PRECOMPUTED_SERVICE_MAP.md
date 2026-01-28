# Pre-computed Service Map for Elastic APM

## Problem Statement

The current service map implementation queries APM indices at runtime using trace sampling, which can be slow for large datasets (2-5+ seconds). The goal is to pre-compute service map data to improve query performance.

## Core Challenge: Destination Resolution

The service map requires resolving `span.destination.service.resource` (e.g., "postgres:5432") to the actual destination `service.name` (e.g., "order-service"). This resolution requires correlating data across different documents:

```
Exit Span                              Destination Transaction
───────────────────────────            ─────────────────────────────────
span.id: "abc123"              ───►    parent.id: "abc123"
span.destination.service.              service.name: "order-service"
  resource: "postgres:5432"
```

---

## Solution Approaches

### 1. Elasticsearch Transforms

**How it works:**
- Continuous transform aggregates exit spans into pre-computed edges
- Destination indices store aggregated service map data
- Kibana queries transform indices instead of raw APM data

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   APM Spans     │────►│   Transform     │────►│ .apm-service-   │
│   (source)      │     │ (continuous)    │     │  map-edges      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

**Transform definition:**
```json
{
  "source": { "index": ["traces-apm*"] },
  "dest": { "index": ".apm-service-map-edges" },
  "pivot": {
    "group_by": {
      "source_service": { "terms": { "field": "service.name" } },
      "source_agent_name": { "terms": { "field": "agent.name" } },
      "destination_resource": { "terms": { "field": "span.destination.service.resource" } }
    },
    "aggregations": {
      "last_seen": { "max": { "field": "@timestamp" } },
      "span_count": { "value_count": { "field": "span.id" } }
    }
  },
  "sync": { "time": { "field": "@timestamp", "delay": "60s" } },
  "frequency": "1m"
}
```

**Pros:**
- No changes to ingest pipeline
- Native Elasticsearch feature (no external components)
- Continuous sync keeps data fresh
- Can be enabled/disabled per deployment

**Cons:**
- Cannot perform cross-index joins (destination resolution still needs runtime query)
- Additional cluster resources for transform execution
- Transform lag (1-2 minutes behind real-time)

**Destination resolution options:**
- **Hybrid**: Store `sample_span.span.id`, resolve at query time via transactions index
- **Skip**: Show `destination_resource` without resolving to service name
- **Service catalog match**: If `destination_resource` matches a known `service.name`, use it

---

### 2. Ingest Pipeline Enrichment

**How it works:**
- Create an enrich index mapping `resource → service`
- Add enrich processor to APM ingest pipeline
- Exit spans are enriched with destination service info before indexing

```
┌──────────────────┐     ┌────────────────────┐     ┌─────────────────┐
│  Enrich Index    │────►│  Ingest Pipeline   │────►│   APM Spans     │
│  resource →      │     │ (enrich processor) │     │ (pre-enriched)  │
│  service         │     └────────────────────┘     └─────────────────┘
└──────────────────┘
```

**Enrich policy:**
```json
{
  "match": {
    "indices": "service-resource-mapping",
    "match_field": "resource",
    "enrich_fields": ["destination_service_name", "destination_agent_name"]
  }
}
```

**Pipeline:**
```json
{
  "processors": [
    {
      "enrich": {
        "policy_name": "service-map-enrichment",
        "field": "span.destination.service.resource",
        "target_field": "span.destination.service.resolved",
        "ignore_missing": true
      }
    }
  ]
}
```

**Pros:**
- Destination resolved at ingest time (no runtime queries)
- Data is complete when indexed

**Cons:**
- Requires modifying APM ingest pipeline (significant scope)
- Enrich index needs regular updates as new services appear
- At ingest time, destination transaction may not exist yet (async tracing)
- Adds latency to ingest (~1-5ms per document)
- Chicken-and-egg: need to build mapping before enrichment works

---

### 3. OpenTelemetry Collector Connector

**How it works:**
- Pre-compute service map metrics in the [Elastic APM Connector](https://github.com/elastic/opentelemetry-collector-components/tree/main/connector/elasticapmconnector)
- Connector already aggregates span metrics, extend to include service map edges
- Export pre-computed edges as metrics or dedicated documents

```
┌─────────────────┐     ┌─────────────────────┐     ┌─────────────────┐
│   OTel Spans    │────►│  Elastic APM        │────►│  Elasticsearch  │
│   (input)       │     │  Connector          │     │  (pre-computed) │
└─────────────────┘     │  - transaction.dur  │     └─────────────────┘
                        │  - service_summary  │
                        │  - service_map_edge │  ← NEW
                        └─────────────────────┘
```

**Potential new metric:**
```
service_map.edge{
  source_service="frontend",
  source_agent="nodejs",
  destination_resource="order-service:8080",
  destination_service="order-service",  ← Resolved in collector!
  span_type="http"
}
```

**Key advantage:** The collector sees ALL spans in a trace context, so it can correlate:
- Exit span from Service A with `span.id`
- Entry transaction in Service B with `parent.id` matching that `span.id`

This enables **destination resolution at ingest time** without the chicken-and-egg problem.

**Pros:**
- Destination resolution is possible (collector sees full trace context)
- Leverages existing connector infrastructure
- Pre-computed before reaching Elasticsearch
- No Elasticsearch transforms needed
- Consistent with existing metric aggregation pattern

**Cons:**
- Only works for OTel-instrumented services using the collector
- Requires changes to collector component
- Stateful aggregation (needs disk storage for high throughput)
- Classic APM agents (non-OTel) wouldn't benefit

**Implementation considerations:**
- The connector already tracks spans by trace ID
- Could maintain a short-lived cache of `span.id → service` mappings
- When exit span arrives, lookup destination from cache
- Export aggregated edges periodically

---

### 4. Hybrid: Collector + Transform

**How it works:**
- OTel Collector pre-computes edges with resolved destinations
- Elasticsearch Transform handles classic APM agent data
- Kibana queries both sources

```
┌─────────────────┐     ┌─────────────────┐
│  OTel Collector │────►│  Elasticsearch  │
│  (pre-resolved) │     │  (edges index)  │◄────┐
└─────────────────┘     └─────────────────┘     │
                                                │
┌─────────────────┐     ┌─────────────────┐     │
│  Classic APM    │────►│   Transform     │─────┘
│  (raw spans)    │     │ (partial res.)  │
└─────────────────┘     └─────────────────┘
```

**Pros:**
- Best of both worlds
- Graceful degradation for classic agents

**Cons:**
- Complexity of two systems
- Potential data duplication

---

### 5. OTel Entity Events (Standards-Based)

**Specification:** [OTel Entity Events](https://github.com/open-telemetry/opentelemetry-specification/blob/main/specification/entities/entity-events.md)

**How it works:**
- Services emit `entity.state` events with `entity.relationships`
- Relationships use standard types like `depends_on`
- Collector aggregates and emits entity events periodically
- Elasticsearch stores pre-computed relationships in logs index

```
┌─────────────────────────────────────────────────────────────────┐
│                    OTel Collector                               │
├─────────────────────────────────────────────────────────────────┤
│  1. Receives spans from all services                            │
│  2. Correlates exit spans (span.id) with entry txns (parent.id) │
│  3. Builds service dependency graph in memory                   │
│  4. Emits entity.state events with relationships                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Elasticsearch                                │
│                    logs-otel-entity-*                           │
├─────────────────────────────────────────────────────────────────┤
│  {                                                              │
│    "event.name": "entity.state",                                │
│    "entity.type": "service",                                    │
│    "entity.id": { "service.name": "frontend" },                 │
│    "entity.relationships": [                                    │
│      {                                                          │
│        "relationship.type": "depends_on",                       │
│        "entity.type": "service",                                │
│        "entity.id": { "service.name": "order-service" }         │
│      }                                                          │
│    ]                                                            │
│  }                                                              │
└─────────────────────────────────────────────────────────────────┘
```

**Entity State Event for Service Map:**
```json
{
  "timestamp": "2026-01-27T10:30:00Z",
  "eventName": "entity.state",
  "attributes": {
    "entity.type": "service",
    "entity.id": {
      "service.name": "frontend",
      "service.namespace": "production"
    },
    "entity.description": {
      "service.version": "1.2.3",
      "agent.name": "nodejs"
    },
    "entity.interval": 60000,
    "entity.relationships": [
      {
        "relationship.type": "depends_on",
        "entity.type": "service",
        "entity.id": { "service.name": "order-service" },
        "attributes": {
          "span.type": "http",
          "span.subtype": "external"
        }
      },
      {
        "relationship.type": "depends_on",
        "entity.type": "database",
        "entity.id": { "db.system": "postgresql", "server.address": "db.example.com" },
        "attributes": {
          "span.type": "db",
          "span.subtype": "postgresql"
        }
      }
    ]
  }
}
```

**Standard Relationship Types:**
| Type | Service Map Meaning |
|------|-------------------|
| `depends_on` | Service A calls Service B |
| `runs_on` | Service runs on host/container |
| `contains` | Service contains endpoints |
| `part_of` | Service is part of application |

**Why this solves destination resolution:**
The collector sees ALL spans in a trace context, so it can correlate:
```
Exit span arrives:     span.id = "abc123", destination_resource = "order-service:8080"
Entry span arrives:    parent.id = "abc123", service.name = "order-service"
                                    ↓
Collector correlates:  "order-service:8080" → "order-service"
```

**Querying in Kibana:**
```typescript
const response = await esClient.search({
  index: 'logs-otel-entity-*',
  query: {
    bool: {
      filter: [
        { term: { 'event.name': 'entity.state' } },
        { term: { 'entity.type': 'service' } },
        { range: { '@timestamp': { gte: 'now-15m' } } }
      ]
    }
  }
});

// Build service map from relationships
for (const hit of response.hits.hits) {
  const entity = hit._source;
  for (const rel of entity['entity.relationships'] ?? []) {
    if (rel['relationship.type'] === 'depends_on') {
      edges.push({
        source: entity['entity.id']['service.name'],
        target: rel['entity.id']['service.name']
      });
    }
  }
}
```

**Pros:**
- ✅ Full destination resolution (collector has trace context)
- ✅ OTel standard format (future-proof)
- ✅ Rich relationship semantics (`depends_on`, `runs_on`, etc.)
- ✅ Lifecycle tracking (`entity.delete` when services go away)
- ✅ Built-in freshness via `entity.interval`
- ✅ No Elasticsearch transforms needed
- ✅ Aligns with Elastic's OTel-first strategy

**Cons:**
- ❌ Only works for OTel-instrumented services
- ❌ Requires collector component development
- ❌ Classic APM agents wouldn't benefit directly
- ❌ Stateful aggregation in collector (memory/disk)
- ❌ Spec is still in "Development" status

**Implementation in Elastic APM Connector:**
The [Elastic APM Connector](https://github.com/elastic/opentelemetry-collector-components/tree/main/connector/elasticapmconnector) already aggregates span metrics. It could be extended to:

1. Track service dependencies as spans flow through
2. Maintain a short-lived cache of `span.id → service` mappings
3. Emit `entity.state` events periodically with `entity.relationships`
4. Use `entity.interval` for freshness (e.g., 60 seconds)
5. Emit `entity.delete` when services are no longer seen

---

## Comparison Matrix

| Approach | Destination Resolution | Ingest Impact | Cluster Load | Implementation Complexity | Standards-Based |
|----------|----------------------|---------------|--------------|--------------------------|-----------------|
| Transform only | Partial (runtime) | None | Medium | Low | ❌ |
| Ingest Pipeline | Full | High (+1-5ms/doc) | Low | High | ❌ |
| OTel Connector (metrics) | Full | None (pre-ES) | None | Medium | ❌ |
| Hybrid (Collector + Transform) | Full (OTel) / Partial (classic) | None | Medium | High | ❌ |
| **OTel Entity Events** | **Full** | **None (pre-ES)** | **None** | **Medium** | **✅** |

---

## Recommendation

### Short-term: Elasticsearch Transforms
- Implement transforms for edge discovery
- Accept partial destination resolution or skip it
- No changes to ingest pipeline required
- Works for both OTel and classic APM agents

### Medium-term: OTel Entity Events
- Implement entity event emission in [Elastic APM Connector](https://github.com/elastic/opentelemetry-collector-components/tree/main/connector/elasticapmconnector)
- Use standard `entity.state` events with `entity.relationships`
- Leverage trace context for full destination resolution
- Aligns with OTel-first strategy and emerging standards

### Long-term: Unified Entity-Based Solution
- OTel Entity Events become the primary source for service topology
- Transform provides fallback for classic APM agents
- Kibana queries both `logs-otel-entity-*` and transform indices
- Single service map API abstracts data sources

```
┌─────────────────────────────────────────────────────────────────┐
│                    Service Map API                              │
├─────────────────────────────────────────────────────────────────┤
│                           │                                     │
│         ┌─────────────────┴─────────────────┐                   │
│         ▼                                   ▼                   │
│  ┌──────────────────┐            ┌──────────────────┐           │
│  │ logs-otel-entity │            │ .apm-service-map │           │
│  │ (Entity Events)  │            │ (Transform)      │           │
│  │ Full resolution  │            │ Partial res.     │           │
│  └──────────────────┘            └──────────────────┘           │
│         │                                   │                   │
│         └─────────────────┬─────────────────┘                   │
│                           ▼                                     │
│                   Merged Service Map                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## References

- [OTel Entity Events Specification](https://github.com/open-telemetry/opentelemetry-specification/blob/main/specification/entities/entity-events.md) - Standards-based entity relationships
- [Elastic APM Connector](https://github.com/elastic/opentelemetry-collector-components/tree/main/connector/elasticapmconnector) - OTel collector component for Elastic APM
- [Elasticsearch Transforms](https://www.elastic.co/guide/en/elasticsearch/reference/current/transforms.html) - Continuous data aggregation
- [Enrich Processor](https://www.elastic.co/guide/en/elasticsearch/reference/current/enrich-processor.html) - Ingest-time enrichment
- [OpenSearch Data Prepper Service Map](https://opensearch.org/docs/latest/data-prepper/pipelines/configuration/processors/service-map-stateful/) - Similar approach in OpenSearch

---

## Current Implementation (Transform-based)

### Files
- `service_map_edges_transform.ts` - Edges transform definition
- `service_entry_points_transform.ts` - Service catalog transform
- `get_precomputed_service_map.ts` - Query and resolution logic
- `create_service_map_indices.ts` - Index templates
- `service_map_transform_manager.ts` - Transform lifecycle

### API Endpoints
- `POST /internal/apm/service-map/transforms` - Install transforms
- `GET /internal/apm/service-map/transforms/status` - Check status
- `DELETE /internal/apm/service-map/transforms` - Uninstall transforms
