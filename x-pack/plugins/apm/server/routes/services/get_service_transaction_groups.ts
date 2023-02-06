/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kqlQuery, rangeQuery } from '@kbn/observability-plugin/server';
import { APMConfig } from '../..';
import { ApmDocumentType } from '../../../common/document_type';
import {
  SERVICE_NAME,
  TRANSACTION_NAME,
  TRANSACTION_OVERFLOW_COUNT,
  TRANSACTION_TYPE,
} from '../../../common/es_fields/apm';
import { LatencyAggregationType } from '../../../common/latency_aggregation_types';
import { environmentQuery } from '../../../common/utils/environment_query';
import { calculateThroughputWithRange } from '../../lib/helpers/calculate_throughput';
import { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import {
  getLatencyAggregation,
  getLatencyValue,
} from '../../lib/helpers/latency_aggregation_type';
import {
  getDocumentTypeFilterForTransactions,
  getDurationFieldForTransactions,
  getProcessorEventForTransactions,
} from '../../lib/helpers/transactions';
import {
  calculateFailedTransactionRate,
  getOutcomeAggregation,
} from '../../lib/helpers/transaction_error_rate';

const txGroupsDroppedBucketName = '_other';

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
  config,
  apmEventClient,
  searchAggregatedTransactions,
  transactionType,
  latencyAggregationType,
  start,
  end,
}: {
  environment: string;
  kuery: string;
  serviceName: string;
  config: APMConfig;
  apmEventClient: APMEventClient;
  searchAggregatedTransactions: boolean;
  transactionType: string;
  latencyAggregationType: LatencyAggregationType;
  start: number;
  end: number;
}) {
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
        track_total_hits: false,
        size: 0,
        query: {
          bool: {
            filter: [
              { term: { [SERVICE_NAME]: serviceName } },
              {
                bool: {
                  should: [
                    { term: { [TRANSACTION_NAME]: txGroupsDroppedBucketName } },
                    { term: { [TRANSACTION_TYPE]: transactionType } },
                  ],
                },
              },
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
          transaction_overflow_count: {
            sum: {
              field: TRANSACTION_OVERFLOW_COUNT,
            },
          },
          transaction_groups: {
            terms: {
              field: TRANSACTION_NAME,
              size: 1000,
              order: { _count: 'desc' },
            },
            aggs: {
              transaction_group_total_duration: {
                sum: { field },
              },
              ...getLatencyAggregation(latencyAggregationType, field),
              ...getOutcomeAggregation(
                searchAggregatedTransactions
                  ? ApmDocumentType.TransactionMetric
                  : ApmDocumentType.TransactionEvent
              ),
            },
          },
        },
      },
    }
  );

  const totalDuration = response.aggregations?.total_duration.value;

  const transactionGroups =
    response.aggregations?.transaction_groups.buckets.map((bucket) => {
      const errorRate = calculateFailedTransactionRate(bucket);

      const transactionGroupTotalDuration =
        bucket.transaction_group_total_duration.value || 0;

      return {
        name: bucket.key as string,
        latency: getLatencyValue({
          latencyAggregationType,
          aggregation: bucket.latency,
        }),
        throughput: calculateThroughputWithRange({
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
    maxTransactionGroupsExceeded:
      (response.aggregations?.transaction_groups.sum_other_doc_count ?? 0) > 0,
    transactionOverflowCount:
      response.aggregations?.transaction_overflow_count.value ?? 0,
  };
}
