/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { termsQuery, rangeQuery } from '@kbn/observability-plugin/server';
import { EntityMetrics } from '../../../common/entities/types';
import {
  ENTITY_ID,
  ENTITY_METRICS_FAILED_TRANSACTION_RATE,
  ENTITY_METRICS_LATENCY,
  ENTITY_METRICS_LOG_ERROR_RATE,
  ENTITY_METRICS_LOG_RATE,
  ENTITY_METRICS_THROUGHPUT,
  LAST_SEEN,
} from '../../../common/es_fields/entities';
import { EntitiesESClient } from '../../lib/helpers/create_es_client/create_assets_es_client/create_assets_es_clients';

interface Params {
  entitiesESClient: EntitiesESClient;
  start: number;
  end: number;
  entityIds: string[];
  size: number;
}

export async function getServiceEntitiesHistoryMetrics({
  end,
  entityIds,
  start,
  entitiesESClient,
  size,
}: Params) {
  const response = await entitiesESClient.searchHistory('get_entities_history', {
    body: {
      size: 0,
      track_total_hits: false,
      query: {
        bool: {
          filter: [...rangeQuery(start, end, LAST_SEEN), ...termsQuery(ENTITY_ID, ...entityIds)],
        },
      },
      aggs: {
        entityIds: {
          terms: { field: ENTITY_ID, size },
          aggs: {
            latency: { avg: { field: ENTITY_METRICS_LATENCY } },
            logErrorRate: { avg: { field: ENTITY_METRICS_LOG_ERROR_RATE } },
            logRate: { avg: { field: ENTITY_METRICS_LOG_RATE } },
            throughput: { avg: { field: ENTITY_METRICS_THROUGHPUT } },
            failedTransactionRate: { avg: { field: ENTITY_METRICS_FAILED_TRANSACTION_RATE } },
          },
        },
      },
    },
  });

  if (!response.aggregations) {
    return {};
  }

  return response.aggregations.entityIds.buckets.reduce<Record<string, EntityMetrics>>(
    (acc, currBucket) => {
      return {
        ...acc,
        [currBucket.key]: {
          latency: currBucket.latency.value ?? null,
          logErrorRate: currBucket.logErrorRate.value ?? null,
          logRate: currBucket.logRate.value ?? null,
          throughput: currBucket.throughput.value ?? null,
          failedTransactionRate: currBucket.failedTransactionRate.value ?? null,
        },
      };
    },
    {}
  );
}
