/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { termsQuery, rangeQuery } from '@kbn/observability-plugin/server';
import { getBucketSize } from '@kbn/apm-data-access-plugin/common';
import { keyBy } from 'lodash';
import {
  ENTITY_METRICS_FAILED_TRANSACTION_RATE,
  ENTITY_METRICS_LATENCY,
  ENTITY_METRICS_LOG_ERROR_RATE,
  ENTITY_METRICS_LOG_RATE,
  ENTITY_METRICS_THROUGHPUT,
  LAST_SEEN,
} from '../../../common/es_fields/entities';
import { SERVICE_NAME } from '../../../common/es_fields/apm';
import { EntitiesESClient } from '../../lib/helpers/create_es_client/create_assets_es_client/create_assets_es_clients';
import { environmentQuery } from '../../../common/utils/environment_query';

interface Params {
  entitiesESClient: EntitiesESClient;
  start: number;
  end: number;
  serviceNames: string[];
  environment: string;
}

export async function getServiceEntitiesHistoryTimeseries({
  start,
  end,
  serviceNames,
  entitiesESClient,
  environment,
}: Params) {
  const { intervalString } = getBucketSize({
    start,
    end,
    minBucketSize: 60,
  });

  const response = await entitiesESClient.searchHistory('get_entities_history_timeseries', {
    body: {
      size: 0,
      track_total_hits: false,
      query: {
        bool: {
          filter: [
            ...rangeQuery(start, end, LAST_SEEN),
            ...termsQuery(SERVICE_NAME, ...serviceNames),
            ...environmentQuery(environment),
          ],
        },
      },
      aggs: {
        serviceNames: {
          terms: { field: SERVICE_NAME, size: serviceNames.length },
          aggs: {
            timeseries: {
              date_histogram: {
                field: '@timestamp',
                fixed_interval: intervalString,
                min_doc_count: 0,
                extended_bounds: { min: start, max: end },
              },
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
      },
    },
  });

  if (!response.aggregations) {
    return {};
  }

  return keyBy(
    response.aggregations.serviceNames.buckets.map((serviceBucket) => {
      const serviceName = serviceBucket.key as string;

      return {
        serviceName,
        latency: serviceBucket.timeseries.buckets.map((bucket) => ({
          x: bucket.key,
          y: bucket.latency.value ?? null,
        })),
        logErrorRate: serviceBucket.timeseries.buckets.map((bucket) => ({
          x: bucket.key,
          y: bucket.logErrorRate.value ?? null,
        })),
        logRate: serviceBucket.timeseries.buckets.map((bucket) => ({
          x: bucket.key,
          y: bucket.logRate.value ?? null,
        })),
        throughput: serviceBucket.timeseries.buckets.map((bucket) => ({
          x: bucket.key,
          y: bucket.throughput.value ?? null,
        })),
        failedTransactionRate: serviceBucket.timeseries.buckets.map((bucket) => ({
          x: bucket.key,
          y: bucket.failedTransactionRate.value ?? null,
        })),
      };
    }),
    'serviceName'
  );
}
