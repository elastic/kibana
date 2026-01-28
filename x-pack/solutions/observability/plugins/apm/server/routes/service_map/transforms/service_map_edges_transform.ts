/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TransformPutTransformRequest } from '@elastic/elasticsearch/lib/api/types';
import type { APMIndices } from '@kbn/apm-sources-access-plugin/server';
import {
  SERVICE_MAP_EDGES_TRANSFORM_ID,
  SERVICE_MAP_EDGES_INDEX,
  SERVICE_MAP_TRANSFORM_FREQUENCY,
  SERVICE_MAP_TRANSFORM_SYNC_DELAY,
  SERVICE_MAP_TRANSFORM_SYNC_FIELD,
  SERVICE_MAP_TRANSFORM_VERSION,
} from './constants';

/**
 * Parses APM index patterns into an array of index patterns.
 * APM indices can contain comma-separated patterns like 'traces-apm*,apm-*,traces-*.otel-*'
 */
function parseIndexPatterns(indexPattern: string | undefined): string[] {
  if (!indexPattern) {
    // Fallback to default APM traces pattern
    return ['traces-apm*', 'apm-*'];
  }
  return indexPattern.split(',').map((pattern) => pattern.trim());
}

/**
 * Transform 1: Service Map Edges
 *
 * Pre-computes service-to-service edges from:
 * - Exit spans (spans with span.destination.service.resource)
 * - Span links (cross-trace connections via span.links or otel.span.links)
 *
 * Groups by source service + destination resource to create
 * aggregated edge data for fast service map queries.
 *
 * Note: We intentionally exclude time_bucket from group_by to reduce
 * cardinality. The transform uses continuous sync to keep data fresh.
 *
 * Cardinality considerations:
 * - destination_resource can have high cardinality if it contains dynamic paths
 * - Consider normalizing resources at ingest time if this becomes an issue
 */
export function getServiceMapEdgesTransformParams(
  apmIndices: APMIndices
): TransformPutTransformRequest {
  // Service map edges come from spans (exit spans and span links)
  const sourceIndices = parseIndexPatterns(apmIndices.span);

  return {
    transform_id: SERVICE_MAP_EDGES_TRANSFORM_ID,
    description:
      'Pre-computes service map edges from exit spans and span links for faster service map queries',
    source: {
      index: sourceIndices,
      query: {
        bool: {
          // Match exit spans OR spans with links
          should: [
            // Exit spans (spans that call external services)
            { exists: { field: 'span.destination.service.resource' } },
            // Span links (cross-trace relationships)
            { exists: { field: 'span.links.trace_id' } },
            { exists: { field: 'otel.span.links.trace_id' } },
          ],
          minimum_should_match: 1,
        },
      },
    },
    dest: {
      index: SERVICE_MAP_EDGES_INDEX,
    },
    pivot: {
      group_by: {
        // Core edge identity - these define a unique service-to-service connection
        source_service: {
          terms: { field: 'service.name' },
        },
        source_agent_name: {
          terms: { field: 'agent.name', missing_bucket: true },
        },
        source_environment: {
          terms: { field: 'service.environment', missing_bucket: true },
        },
        destination_resource: {
          terms: { field: 'span.destination.service.resource', missing_bucket: true },
        },
        // Connection type helps distinguish HTTP vs DB vs messaging edges
        span_type: {
          terms: { field: 'span.type', missing_bucket: true },
        },
        span_subtype: {
          terms: { field: 'span.subtype', missing_bucket: true },
        },
        // No time_bucket - reduces cardinality, we track last_seen instead
      },
      aggregations: {
        // Track when this edge was last seen (for time-range filtering)
        last_seen: {
          max: { field: '@timestamp' },
        },
        // Track when this edge was first seen
        first_seen: {
          min: { field: '@timestamp' },
        },
        // Count of spans for this edge
        span_count: {
          value_count: { field: 'span.id' },
        },
        // Sample span data for edge correlation and destination resolution
        // - span.id: used to find destination transaction (where parent.id = span.id)
        // - span.links.*: for span link resolution (presence indicates hasSpanLinks)
        sample_span: {
          top_metrics: {
            metrics: [
              { field: 'span.id' },
              { field: 'span.links.span_id' },
              { field: 'otel.span.links.span_id' },
            ],
            sort: { '@timestamp': 'desc' as const },
            size: 1,
          },
        },
      },
    },
    sync: {
      time: {
        field: SERVICE_MAP_TRANSFORM_SYNC_FIELD,
        delay: SERVICE_MAP_TRANSFORM_SYNC_DELAY,
      },
    },
    frequency: SERVICE_MAP_TRANSFORM_FREQUENCY,
    settings: {
      deduce_mappings: false,
      unattended: true,
      max_page_search_size: 1000,
    },
    _meta: {
      version: SERVICE_MAP_TRANSFORM_VERSION,
      managed: true,
      managed_by: 'observability-apm',
    },
  };
}
