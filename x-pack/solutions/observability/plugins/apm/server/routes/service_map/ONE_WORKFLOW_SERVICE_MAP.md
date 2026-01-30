# Pre-computed Service Map with OneWorkflow

## Overview

This document explores using **OneWorkflow** to pre-compute service map data, addressing the core challenge of **destination resolution** that cannot be solved with Elasticsearch transforms alone.

## The Problem with Transforms

Elasticsearch transforms can aggregate exit spans efficiently:

```
service.name + span.destination.service.resource → aggregated edge
```

But they **cannot** resolve the destination service because:
1. Transforms operate on a single source index
2. Destination resolution requires correlating `span.id` with `parent.id` in the **transactions** index
3. This is a cross-index join operation

## Service Map Edge Types

The service map has **two types of connections** that need resolution:

### 1. Exit Spans (Parent-Child Relationship)

```
┌─────────────────────┐         ┌─────────────────────┐
│ Service A           │         │ Service B           │
│                     │         │                     │
│  Exit Span          │────────►│  Transaction        │
│  span.id = "abc"    │         │  parent.id = "abc"  │
│  destination =      │         │  service.name = "B" │
│    "svc-b:8080"     │         │                     │
└─────────────────────┘         └─────────────────────┘

Resolution: exit_span.span.id == transaction.parent.id
```

### 2. Span Links (Cross-Trace Relationship)

Span links connect spans across different traces (e.g., async messaging, batch processing):

```
┌─────────────────────┐         ┌─────────────────────┐
│ Service A           │         │ Service B           │
│ Trace: "trace-1"    │         │ Trace: "trace-2"    │
│                     │         │                     │
│  Producer Span      │────────►│  Consumer Span      │
│  span.id = "xyz"    │         │  span.links.span_id │
│                     │         │    = ["xyz"]        │
└─────────────────────┘         └─────────────────────┘

Resolution: producer.span.id == consumer.span.links.span_id
```

## OneWorkflow Solution

OneWorkflow orchestrates a multi-step pipeline that pre-computes service map edges by:
1. Aggregating exit spans and span links from APM data
2. Bulk indexing edges to `.apm-service-map-workflow` index
3. Resolving destination services via targeted lookups
4. Cleaning up old edges periodically

### Architecture

The solution uses **TypeScript endpoints** for complex logic, keeping the workflow simple and maintainable:

```
┌─────────────────────────────────────────────────────────────────┐
│                    OneWorkflow Pipeline                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────┐                                             │
│  │ Triggers       │  - scheduled: every 5m                      │
│  │                │  - manual: on-demand via API                │
│  └───────┬────────┘                                             │
│          │                                                       │
│          ▼                                                       │
│  ┌────────────────────────────────────────────┐                 │
│  │ STEP 1: Setup Index                        │                 │
│  │   Create .apm-service-map-workflow         │                 │
│  └───────┬────────────────────────────────────┘                 │
│          │                                                       │
│          ▼                                                       │
│  ┌────────────────────────────────────────────┐                 │
│  │ STEP 2: Compute Edges                      │                 │
│  │   POST /internal/apm/service-map/           │                 │
│  │            workflow/compute-edges          │                 │
│  │                                            │                 │
│  │   Aggregate exit spans (composite)         │                 │
│  │   ├─ Aggregate span links (composite)      │                 │
│  │   └─ Bulk index all edges                  │                 │
│  └───────┬────────────────────────────────────┘                 │
│          │                                                       │
│          ▼                                                       │
│  ┌────────────────────────────────────────────┐                 │
│  │ STEP 3: Resolve Destinations               │                 │
│  │   POST /internal/apm/service-map/           │                 │
│  │            workflow/resolve-destinations   │                 │
│  │                                            │                 │
│  │                   │                        │
│  │   Find unresolved exit span edges          │                 │
│  │   ├─ Batch lookup transactions             │                 │
│  │   │   (parent.id = sample_span_id)         │                 │
│  │   ├─ Find unresolved span link edges       │                 │
│  │   ├─ Batch lookup spans                    │                 │
│  │   │   (span.id = sample_span_id)           │                 │
│  │   └─ Bulk update resolved edges            │                 │
│  └───────┬────────────────────────────────────┘                 │
│          │                                                       │
│          ▼                                                       │
│  ┌────────────────────────────────────────────┐                 │
│  │ STEP 4: Cleanup                             │                 │
│  │   POST /internal/apm/service-map/           │                 │
│  │            workflow/cleanup                │                 │
│  │                                            │                 │
│  │   └─ Delete edges older than 24h            │                 │
│  └───────┬────────────────────────────────────┘                 │
│          │                                                       │
│          ▼                                                       │
│  ┌────────────────────────────────────────────┐                 │
│  │ Result: .apm-service-map-workflow          │                 │
│  │   - Fully resolved edges                   │                 │
│  │   - Exit spans + Span links                │                 │
│  │   - Incrementally updated every 5m         │                 │
│  └────────────────────────────────────────────┘                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Why TypeScript Endpoints?

| Approach | Pros | Cons |
|----------|------|------|
| **Jinja Templating** | Simple workflow | Complex logic hard to maintain, no type safety, difficult to debug |
| **TypeScript Endpoints** ✅ | Type-safe, testable, debuggable, reusable | Requires separate files |

The TypeScript endpoint approach provides:
- **Type Safety**: Full TypeScript type checking
- **Testability**: Unit tests for business logic
- **Maintainability**: Complex aggregations in readable TypeScript
- **Reusability**: Endpoints can be called from other workflows or APIs
- **Performance**: Optimized bulk operations without Jinja overhead

---

## Complete Workflow YAML

This workflow uses **Kibana API endpoints** (`kibana.request`) to delegate all complex logic to TypeScript. The workflow itself is a simple orchestrator with just 5 steps.

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
  edges_index: ".apm-service-map-workflow"

# ═══════════════════════════════════════════════════════════════════════════════
# WORKFLOW SUMMARY (Simplified)
# ═══════════════════════════════════════════════════════════════════════════════
# 
# All complex aggregation, indexing, and resolution logic is handled by 
# TypeScript endpoints in workflow_routes.ts. The workflow just orchestrates.
#
# Step 1: Setup index (if not exists)
# Step 2: Call /compute-edges endpoint (aggregates + indexes exit spans & span links)
# Step 3: Call /resolve-destinations endpoint (resolves destination services)
# Step 4: Call /cleanup endpoint (removes edges older than 24h)
# Step 5: Log completion
#
# Total workflow steps: 5
# ═══════════════════════════════════════════════════════════════════════════════

steps:

  # ───────────────────────────────────────────────────────────────────────────
  # STEP 1: Setup Index
  # ───────────────────────────────────────────────────────────────────────────

  - name: create_edges_index
    type: elasticsearch.indices.create
    with:
      index: "{{ consts.edges_index }}"
      mappings:
        properties:
          source_service:         { type: keyword }
          source_agent:           { type: keyword }
          source_environment:     { type: keyword }
          destination_resource:   { type: keyword }
          destination_service:    { type: keyword }
          destination_environment: { type: keyword }
          destination_agent:      { type: keyword }
          span_type:              { type: keyword }
          span_subtype:           { type: keyword }
          edge_type:              { type: keyword }
          span_count:             { type: long }
          sample_span_id:          { type: keyword }
          sample_span_ids:         { type: keyword }
          computed_at:             { type: date }
    on-failure:
      continue: true

  # ───────────────────────────────────────────────────────────────────────────
  # STEP 2: Compute Edges
  #
  # Calls Kibana endpoint that:
  # - Aggregates exit spans (composite agg by service + destination)
  # - Aggregates span links (composite agg by service + span name)
  # - Updates edges using upsert (preserves existing resolved destinations)
  #   - New edges: created with destination_service = null
  #   - Existing edges: updated, but resolved destinations are preserved
  #   - Only unresolved edges get destination fields reset to null
  # ───────────────────────────────────────────────────────────────────────────

  - name: compute_edges
    type: kibana.request
    with:
      method: POST
      path: "/internal/apm/service-map/workflow/compute-edges"
      headers:
        kbn-xsrf: "true"
    on-failure:
      continue: true

  # ───────────────────────────────────────────────────────────────────────────
  # STEP 3: Resolve Destinations
  #
  # Calls Kibana endpoint that:
  # - Finds unresolved exit span edges (destination_service = null)
  # - Looks up transactions where parent.id matches sample_span_id
  # - Finds unresolved span link edges
  # - Looks up spans where span.id matches sample_span_id
  # - Bulk updates all matched edges with destination info
  # ───────────────────────────────────────────────────────────────────────────

  - name: resolve_destinations
    type: kibana.request
    with:
      method: POST
      path: "/internal/apm/service-map/workflow/resolve-destinations"
      headers:
        kbn-xsrf: "true"
    on-failure:
      continue: true

  # ───────────────────────────────────────────────────────────────────────────
  # STEP 4: Cleanup Old Edges
  #
  # Calls Kibana endpoint that:
  # - Deletes edges with computed_at older than 24h
  # ───────────────────────────────────────────────────────────────────────────

  - name: cleanup
    type: kibana.request
    with:
      method: POST
      path: "/internal/apm/service-map/workflow/cleanup"
      headers:
        kbn-xsrf: "true"
    on-failure:
      continue: true

  # ───────────────────────────────────────────────────────────────────────────
  # STEP 5: Log Completion
  # ───────────────────────────────────────────────────────────────────────────

  - name: log_completion
    type: console
    with:
      message: |
        Service map pre-computation complete.
        - Compute result: {{ steps.compute_edges.output }}
        - Resolve result: {{ steps.resolve_destinations.output }}
        - Cleanup result: {{ steps.cleanup.output }}
```

---

## How Destination Resolution Works

### Targeted Lookup Pattern (Avoiding High Cardinality)

The key insight: **edges are low cardinality** (~100-1000 unique service × destination pairs), while **span IDs are high cardinality** (millions of individual requests).

```
┌─────────────────────────────────────────────────────────────────┐
│                    Resolution Flow                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. AGGREGATE EDGES (LOW CARDINALITY)                           │
│     ┌─────────────────────────────────────────────────────┐     │
│     │ Composite Agg: GROUP BY (service, destination)      │     │
│     │                                                     │     │
│     │ Result: ~100-1000 unique edges (not millions!)       │     │
│     │ Each edge has: sample_span_id for resolution        │     │
│     └─────────────────────────────────────────────────────┘     │
│                           │                                      │
│                           ▼                                      │
│  2. BATCH LOOKUP: TARGETED QUERIES                              │
│     ┌─────────────────────────────────────────────────────┐     │
│     │ For unresolved edges:                               │     │
│     │                                                     │     │
│     │   Query: Find transactions/spans where             │     │
│     │          parent.id/span.id IN [sample_span_ids]     │     │
│     │                                                     │     │
│     │   Result: Map span_id → destination service        │     │
│     └─────────────────────────────────────────────────────┘     │
│                           │                                      │
│                           ▼                                      │
│  3. BULK UPDATE ALL MATCHED EDGES                              │
│     ┌─────────────────────────────────────────────────────┐     │
│     │ _bulk API: Update all edges with destination info  │     │
│     │                                                     │     │
│     │ {                                                   │     │
│     │   source_service: "frontend",                       │     │
│     │   destination_resource: "order-svc:8080",           │     │
│     │   destination_service: "order-service",  ← resolved │     │
│     │   destination_agent: "java"              ← resolved │     │
│     │ }                                                   │     │
│     └─────────────────────────────────────────────────────┘     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Why This Works

| Approach | Cardinality | Lookups | Performance |
|----------|-------------|---------|-------------|
| ❌ Index all span IDs | Millions | N/A (pre-built) | High memory, slow updates |
| ✅ Targeted lookup per edge | ~1000 edges | ~1000 batch queries | Fast, incremental |

### Exit Span Resolution

```
Exit Span (Service A)          Transaction (Service B)
────────────────────           ─────────────────────────
span.id = "abc123"     ───►    parent.id = "abc123"
destination = "B:8080"         service.name = "B"
                               agent.name = "java"
```

### Span Link Resolution

```
Producer Span (Service A)      Consumer Span (Service B)
Trace: "trace-1"              Trace: "trace-2"
────────────────────           ─────────────────────────
span.id = "xyz789"     ───►    span.links.span_id = ["xyz789"]
                               service.name = "B"
                               agent.name = "go"
```

---

## Incremental Updates and Destination Preservation

### Preserving Resolved Destinations

The workflow uses **incremental updates** with **destination preservation** to avoid overwriting resolved edges:

1. **Compute Edges Step**:
   - Uses `update` with `upsert` instead of `index`
   - **Preserves** `destination_service` if it's already resolved (not null)
   - **Updates** aggregatable fields (span_count, computed_at, etc.)
   - **Creates** new edges with `destination_service = null`

2. **Resolve Destinations Step**:
   - Only updates edges where `destination_service` is currently null
   - Uses batch lookups to resolve multiple edges efficiently

**Why this matters**: Without preservation, each workflow run would reset resolved destinations back to null, requiring re-resolution every time. With preservation, once an edge is resolved, it stays resolved even as new edges are added.

### Example Flow

```
Run 1:
  - Edge A: created with destination_service = null
  - Edge B: created with destination_service = null
  - Resolution: Edge A resolved → destination_service = "service-x"
  - Edge B: still null (no match found)

Run 2 (5 minutes later):
  - Edge A: updated (preserves destination_service = "service-x") ✅
  - Edge B: updated (still null, will try resolution again)
  - Edge C: created (new edge, destination_service = null)
  - Resolution: Edge B resolved → destination_service = "service-y"
  - Edge C: still null (no match found)

Run 3 (5 minutes later):
  - Edge A: updated (preserves destination_service = "service-x") ✅
  - Edge B: updated (preserves destination_service = "service-y") ✅
  - Edge C: updated (still null, will try resolution again)
```

---

## Performance Characteristics

- **Workflow Execution**: ~5-10 seconds per run
- **Edge Aggregation**: ~1-2 seconds (composite aggregation, 1000 max buckets)
- **Bulk Indexing**: ~0.5-1 second (single `_bulk` request)
- **Destination Resolution**: ~2-5 seconds (batch lookups + bulk update)
- **Cleanup**: ~0.5 seconds (`_delete_by_query`)

---

