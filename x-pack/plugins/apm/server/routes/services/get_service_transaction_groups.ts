/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rangeQuery, kqlQuery } from '@kbn/observability-plugin/server';
import {
  EVENT_OUTCOME,
  SERVICE_NAME,
  TRANSACTION_NAME,
  TRANSACTION_TYPE,
} from '../../../common/elasticsearch_fieldnames';
import { EventOutcome } from '../../../common/event_outcome';
import { LatencyAggregationType } from '../../../common/latency_aggregation_types';
import { environmentQuery } from '../../../common/utils/environment_query';
import {
  getDocumentTypeFilterForTransactions,
  getDurationFieldForTransactions,
  getProcessorEventForTransactions,
} from '../../lib/helpers/transactions';
import { calculateThroughput } from '../../lib/helpers/calculate_throughput';
import {
  getLatencyAggregation,
  getLatencyValue,
} from '../../lib/helpers/latency_aggregation_type';
import { Setup } from '../../lib/helpers/setup_request';
import { calculateFailedTransactionRate } from '../../lib/helpers/transaction_error_rate';

export type ServiceOverviewTransactionGroupSortField =
  | 'name'
  | 'latency'
  | 'throughput'
  | 'errorRate'
  | 'impact';

export async function getServiceTransactionGroups({
  environment,
  kuery,
  serviceName,
  setup,
  searchAggregatedTransactions,
  transactionType,
  latencyAggregationType,
  start,
  end,
}: {
  environment: string;
  kuery: string;
  serviceName: string;
  setup: Setup;
  searchAggregatedTransactions: boolean;
  transactionType: string;
  latencyAggregationType: LatencyAggregationType;
  start: number;
  end: number;
}) {
  const { apmEventClient, config } = setup;
  const bucketSize = config.ui.transactionGroupBucketSize;

  const field = getDurationFieldForTransactions(searchAggregatedTransactions);

  const response = await apmEventClient.search(
    'get_service_transaction_groups',
    {
      apm: {
        events: [
          getProcessorEventForTransactions(searchAggregatedTransactions),
        ],
      },
      body: {
        size: 0,
        query: {
          bool: {
            filter: [
              { term: { [SERVICE_NAME]: serviceName } },
              { term: { [TRANSACTION_TYPE]: transactionType } },
              ...getDocumentTypeFilterForTransactions(
                searchAggregatedTransactions
              ),
              ...rangeQuery(start, end),
              ...environmentQuery(environment),
              ...kqlQuery(kuery),
            ],
          },
        },
        aggs: {
          total_duration: { sum: { field } },
          transaction_groups: {
            terms: {
              field: TRANSACTION_NAME,
              size: bucketSize,
              order: { _count: 'desc' },
            },
            aggs: {
              transaction_group_total_duration: {
                sum: { field },
              },
              ...getLatencyAggregation(latencyAggregationType, field),
              [EVENT_OUTCOME]: {
                terms: {
                  field: EVENT_OUTCOME,
                  include: [EventOutcome.failure, EventOutcome.success],
                },
              },
            },
          },
        },
      },
    }
  );

  const totalDuration = response.aggregations?.total_duration.value;

  const transactionGroups =
    response.aggregations?.transaction_groups.buckets.map((bucket) => {
      const errorRate = calculateFailedTransactionRate(bucket[EVENT_OUTCOME]);

      const transactionGroupTotalDuration =
        bucket.transaction_group_total_duration.value || 0;

      return {
        name: bucket.key as string,
        latency: getLatencyValue({
          latencyAggregationType,
          aggregation: bucket.latency,
        }),
        throughput: calculateThroughput({
          start,
          end,
          value: bucket.doc_count,
        }),
        errorRate,
        impact: totalDuration
          ? (transactionGroupTotalDuration * 100) / totalDuration
          : 0,
      };
    }) ?? [];

  return {
    transactionGroups: transactionGroups.map((transactionGroup) => ({
      ...transactionGroup,
      transactionType,
    })),
    isAggregationAccurate:
      (response.aggregations?.transaction_groups.sum_other_doc_count ?? 0) ===
      0,
    bucketSize,
  };
}
