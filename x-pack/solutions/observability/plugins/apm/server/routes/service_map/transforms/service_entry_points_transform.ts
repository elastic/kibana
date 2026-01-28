/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TransformPutTransformRequest } from '@elastic/elasticsearch/lib/api/types';
import type { APMIndices } from '@kbn/apm-sources-access-plugin/server';
import {
  SERVICE_MAP_ENTRY_POINTS_TRANSFORM_ID,
  SERVICE_MAP_ENTRY_POINTS_INDEX,
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
 * Transform 2: Service Catalog
 *
 * Creates a catalog of services and the resources they expose.
 * This helps resolve destination_resource -> service_name mappings.
 *
 * Low cardinality: services × environments (not individual span IDs).
 */
export function getServiceEntryPointsTransformParams(
  apmIndices: APMIndices
): TransformPutTransformRequest {
  // Transactions are stored in the same indices as spans
  const sourceIndices = parseIndexPatterns(apmIndices.transaction);

  return {
    transform_id: SERVICE_MAP_ENTRY_POINTS_TRANSFORM_ID,
    description: 'Catalog of services for service map destination resolution',
    source: {
      index: sourceIndices,
      query: {
        bool: {
          filter: [{ exists: { field: 'transaction.id' } }],
        },
      },
    },
    dest: {
      index: SERVICE_MAP_ENTRY_POINTS_INDEX,
    },
    pivot: {
      group_by: {
        // Service identity - low cardinality
        service_name: {
          terms: { field: 'service.name' },
        },
        service_environment: {
          terms: { field: 'service.environment', missing_bucket: true },
        },
      },
      aggregations: {
        // Track transaction count for this service
        transaction_count: {
          value_count: { field: 'transaction.id' },
        },
        // When last seen
        last_seen: {
          max: { field: '@timestamp' },
        },
        // First seen
        first_seen: {
          min: { field: '@timestamp' },
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
