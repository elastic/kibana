/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { SloStatus } from '../../../../common/service_inventory';
import { MAX_NUMBER_OF_SERVICES } from './get_services_items';

const SLO_SUMMARY_INDEX_PATTERN = '.slo-observability.summary-v*';

// APM SLO indicator types
const APM_SLO_INDICATOR_TYPES = ['sli.apm.transactionDuration', 'sli.apm.transactionErrorRate'];

// SLO status priority (higher index = lower priority)
// When determining the "most important" status, we pick the one with lowest index
const STATUS_PRIORITY: SloStatus[] = ['violated', 'degrading', 'noData', 'stale', 'healthy'];

export interface ServiceSloInfo {
  serviceName: string;
  sloStatus: SloStatus;
  sloCount: number;
}

export type ServiceSlosResponse = ServiceSloInfo[];

// Map SLO schema status (uppercase) to our lowercase status
const STATUS_MAP: Record<string, SloStatus> = {
  VIOLATED: 'violated',
  DEGRADING: 'degrading',
  NO_DATA: 'noData',
  HEALTHY: 'healthy',
};

interface StatusBucket {
  key: string;
  doc_count: number;
}

interface ServiceBucket {
  key: string;
  doc_count: number;
  stale: { doc_count: number };
  statuses: { buckets: StatusBucket[] };
}

export async function getServicesSlos({
  esClient,
  spaceId,
  environment,
  maxNumServices = MAX_NUMBER_OF_SERVICES,
  serviceNames,
}: {
  esClient: ElasticsearchClient;
  spaceId: string;
  environment?: string;
  maxNumServices?: number;
  serviceNames?: string[];
}): Promise<ServiceSlosResponse> {
  const staleThresholdHours = 2; // Default stale threshold

  const environmentFilter =
    environment && environment !== 'ENVIRONMENT_ALL'
      ? [{ term: { 'service.environment': environment } }]
      : [];

  // Only query for specific services if provided (optimization)
  const serviceNameFilter = serviceNames?.length
    ? [{ terms: { 'service.name': serviceNames } }]
    : [];

  const result = await esClient.search({
    index: SLO_SUMMARY_INDEX_PATTERN,
    size: 0,
    track_total_hits: false,
    query: {
      bool: {
        filter: [
          { term: { spaceId } },
          { terms: { 'slo.indicator.type': APM_SLO_INDICATOR_TYPES } },
          { exists: { field: 'service.name' } },
          ...environmentFilter,
          ...serviceNameFilter,
        ],
      },
    },
    aggs: {
      services: {
        terms: {
          field: 'service.name',
          size: maxNumServices,
        },
        aggs: {
          // Count stale SLOs (not updated recently)
          stale: {
            filter: {
              range: {
                summaryUpdatedAt: { lt: `now-${staleThresholdHours}h` },
              },
            },
          },
          // Group non-stale SLOs by status using terms aggregation (simpler than multiple filters)
          statuses: {
            terms: {
              field: 'status',
              size: 4, // VIOLATED, DEGRADING, NO_DATA, HEALTHY
            },
          },
        },
      },
    },
  });

  const serviceBuckets =
    (result.aggregations?.services as { buckets: ServiceBucket[] })?.buckets ?? [];

  return serviceBuckets.map((bucket) => {
    const staleCount = bucket.stale?.doc_count ?? 0;

    // Build status counts from terms aggregation
    const statusCounts: Record<SloStatus, number> = {
      violated: 0,
      degrading: 0,
      noData: 0,
      stale: staleCount,
      healthy: 0,
    };

    // Map uppercase statuses to lowercase and count
    for (const statusBucket of bucket.statuses?.buckets ?? []) {
      const mappedStatus = STATUS_MAP[statusBucket.key];
      if (mappedStatus) {
        statusCounts[mappedStatus] = statusBucket.doc_count;
      }
    }

    // Find the most important status with count > 0
    let mostImportantStatus: SloStatus = 'healthy';
    let mostImportantCount = statusCounts.healthy;

    for (const status of STATUS_PRIORITY) {
      if (statusCounts[status] > 0) {
        mostImportantStatus = status;
        mostImportantCount = statusCounts[status];
        break;
      }
    }

    return {
      serviceName: bucket.key,
      sloStatus: mostImportantStatus,
      sloCount: mostImportantCount,
    };
  });
}
