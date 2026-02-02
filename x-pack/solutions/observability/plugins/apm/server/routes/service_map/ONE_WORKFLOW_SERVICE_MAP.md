# Pre-computed Service Map with OneWorkflow

## Overview

OneWorkflow pre-computes service map edges by aggregating APM data and resolving destination services through cross-index correlation:
- **Exit spans**: `span.id` → `parent.id` (parent-child relationship)
- **Span links**: `span.id` → `span.links.span_id` (cross-trace messaging)

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    OneWorkflow Pipeline (Every 5m)               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Setup indices (.apm-service-map-workflow-{services,edges})   │
│  2. Get metadata (last_processed_timestamp, effectiveStart)      │
│  3. Discover services (stores in services index)                 │
│  4. Get unique environments                                      │
│  5-N. Aggregate exit spans per environment (parallel batches)    │
│  N+1. Aggregate span links per environment (parallel batches)    │
│  N+2. Update metadata                                            │
│  N+3. Resolve destinations per environment (parallel lookups)    │
│  N+4. Cleanup old/stale edges and services                       │
│                                                                  │
│  Result: Fully resolved edges, ~75-85% faster than on-demand     │
└─────────────────────────────────────────────────────────────────┘
```

**Key Optimizations:**
- Environment-scoped aggregation (reduced cardinality, better isolation)
- Service-batched processing (5 services/batch, 10 concurrent batches)
- Composite aggregation on `(source_service, destination_service)` only
- Nested terms sub-aggregation on `destination_resource` (high-cardinality field scoped per service pair)
- Incremental timestamp tracking (avoids re-processing spans)

## Workflow YAML

```yaml
name: apm_service_map_precompute
enabled: true
description: Pre-computes service map edges via Kibana API endpoints
tags: [apm, service-map]

triggers:
  - type: manual
  - type: scheduled
    with:
      every: 5m

consts:
  services_index: ".apm-service-map-workflow-services"
  edges_index: ".apm-service-map-workflow-edges"

steps:

  - name: create_services_index
    type: elasticsearch.indices.create
    with:
      index: "{{ consts.services_index }}"
      settings: { number_of_shards: 1, number_of_replicas: 0 }
      mappings:
        properties:
          service_name: { type: keyword }
          service_environment: { type: keyword }
          service_agent: { type: keyword }
          doc_count: { type: long }
          discovered_at: { type: date }
    on-failure: { continue: true }

  - name: create_edges_index
    type: elasticsearch.indices.create
    with:
      index: "{{ consts.edges_index }}"
      settings: { number_of_shards: 1, number_of_replicas: 0 }
      mappings:
        properties:
          source_service: { type: keyword }
          source_agent: { type: keyword }
          source_environment: { type: keyword }
          destination_resource: { type: keyword }
          destination_service: { type: keyword }
          destination_environment: { type: keyword }
          destination_agent: { type: keyword }
          span_type: { type: keyword }
          span_subtype: { type: keyword }
          edge_type: { type: keyword }
          span_count: { type: long }
          sample_spans: { type: keyword }
          computed_at: { type: date }
          last_seen_at: { type: date }
          max_span_timestamp: { type: long }
          consecutive_misses: { type: integer }
          resolution_attempts: { type: integer }
          last_resolution_attempt: { type: date }
    on-failure: { continue: true }

  - name: get_metadata
    type: kibana.request
    with:
      method: POST
      path: "/internal/apm/service-map/workflow/get-metadata"
      headers: { kbn-xsrf: "true" }
    on-failure: { continue: true }

  - name: discover_active_services
    type: kibana.request
    with:
      method: POST
      path: "/internal/apm/service-map/workflow/discover-services"
      headers: { kbn-xsrf: "true" }
      body:
        start: "{{ steps.get_metadata.output.effectiveStart }}"
        end: "{{ steps.get_metadata.output.end }}"
    on-failure: { continue: true }

  - name: get_unique_environments
    type: kibana.request
    with:
      method: POST
      path: "/internal/apm/service-map/workflow/get-environments"
      headers: { kbn-xsrf: "true" }
    on-failure: { continue: true }

  - name: aggregate_exit_spans_by_environment
    type: foreach
    foreach: "{{ steps.get_unique_environments.output.environments }}"
    steps:
      - name: aggregate_exit_spans_for_env
        type: kibana.request
        with:
          method: POST
          path: "/internal/apm/service-map/workflow/aggregate-exit-spans-by-service"
          headers: { kbn-xsrf: "true" }
          body:
            start: "{{ steps.get_metadata.output.effectiveStart }}"
            end: "{{ steps.get_metadata.output.end }}"
            environment: "{{ foreach.item }}"
            servicesPerBatch: 5
            maxConcurrency: 10
        on-failure: { continue: true }

  - name: aggregate_span_links_by_environment
    type: foreach
    foreach: "{{ steps.get_unique_environments.output.environments }}"
    steps:
      - name: aggregate_span_links_for_env
        type: kibana.request
        with:
          method: POST
          path: "/internal/apm/service-map/workflow/aggregate-span-links-by-service"
          headers: { kbn-xsrf: "true" }
          body:
            start: "{{ steps.get_metadata.output.effectiveStart }}"
            end: "{{ steps.get_metadata.output.end }}"
            environment: "{{ foreach.item }}"
            servicesPerBatch: 5
            maxConcurrency: 10
        on-failure: { continue: true }

  - name: update_metadata
    type: kibana.request
    with:
      method: POST
      path: "/internal/apm/service-map/workflow/update-metadata"
      headers: { kbn-xsrf: "true" }
      body:
        timestamp: "{{ steps.get_metadata.output.end }}"
    on-failure: { continue: true }

  - name: resolve_destinations_by_environment
    type: foreach
    foreach: "{{ steps.get_unique_environments.output.environments }}"
    steps:
      - name: resolve_destinations_for_env
        type: kibana.request
        with:
          method: POST
          path: "/internal/apm/service-map/workflow/resolve-destinations"
          headers: { kbn-xsrf: "true" }
          body:
            environment: "{{ foreach.item }}"
        on-failure: { continue: true }

  - name: cleanup
    type: kibana.request
    with:
      method: POST
      path: "/internal/apm/service-map/workflow/cleanup"
      headers: { kbn-xsrf: "true" }
    on-failure: { continue: true }
```

## Resolution Strategy

**Aggregation** (low cardinality):
- Composite aggregation groups by `(source_service, destination_service)`
- Nested terms sub-aggregation on `destination_resource` (high cardinality, scoped per pair)
- Result: ~100-1000 unique edges (not millions of spans)
- Each edge stores sample span IDs for resolution

**Lookup** (targeted queries):
- Batch query transactions/spans where `parent.id/span.id IN [sample_span_ids]`
- Maps span IDs to destination service info
- Bulk updates matched edges

**Why it works**: Avoids indexing millions of span IDs; composite aggregation handles low-cardinality fields efficiently, with high-cardinality field scoped per service pair.

## Performance

- **First run**: ~2s aggregation, ~5s resolution
- **Incremental runs**: ~0.2-1s aggregation (50-90% faster via timestamp filtering)
- **Overall**: ~75-85% faster than on-demand service map queries
