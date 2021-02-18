/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EVENT_OUTCOME,
  SERVICE_NAME,
  TRANSACTION_NAME,
  TRANSACTION_TYPE,
} from '../../../common/elasticsearch_fieldnames';
import { EventOutcome } from '../../../common/event_outcome';
import { LatencyAggregationType } from '../../../common/latency_aggregation_types';
import { environmentQuery, rangeQuery } from '../../../common/utils/queries';
import { withApmSpan } from '../../utils/with_apm_span';
import {
  getDocumentTypeFilterForAggregatedTransactions,
  getProcessorEventForAggregatedTransactions,
  getTransactionDurationFieldForAggregatedTransactions,
} from '../helpers/aggregated_transactions';
import { calculateThroughput } from '../helpers/calculate_throughput';
import {
  getLatencyAggregation,
  getLatencyValue,
} from '../helpers/latency_aggregation_type';
import { Setup, SetupTimeRange } from '../helpers/setup_request';
import { calculateTransactionErrorPercentage } from '../helpers/transaction_error_rate';

export type ServiceOverviewTransactionGroupSortField =
  | 'name'
  | 'latency'
  | 'throughput'
  | 'errorRate'
  | 'impact';

export async function getServiceTransactionGroups({
  environment,
  serviceName,
  setup,
  searchAggregatedTransactions,
  transactionType,
  latencyAggregationType,
}: {
  environment?: string;
  serviceName: string;
  setup: Setup & SetupTimeRange;
  searchAggregatedTransactions: boolean;
  transactionType: string;
  latencyAggregationType: LatencyAggregationType;
}) {
  return withApmSpan('get_service_transaction_groups', async () => {
    const { apmEventClient, start, end, esFilter } = setup;

    const field = getTransactionDurationFieldForAggregatedTransactions(
      searchAggregatedTransactions
    );

    const response = await apmEventClient.search({
      apm: {
        events: [
          getProcessorEventForAggregatedTransactions(
            searchAggregatedTransactions
          ),
        ],
      },
      body: {
        size: 0,
        query: {
          bool: {
            filter: [
              { term: { [SERVICE_NAME]: serviceName } },
              { term: { [TRANSACTION_TYPE]: transactionType } },
              ...getDocumentTypeFilterForAggregatedTransactions(
                searchAggregatedTransactions
              ),
              ...rangeQuery(start, end),
              ...environmentQuery(environment),
              ...esFilter,
            ],
          },
        },
        aggs: {
          total_duration: { sum: { field } },
          transaction_groups: {
            terms: {
              field: TRANSACTION_NAME,
              size: 500,
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
    });

    const totalDuration = response.aggregations?.total_duration.value;

    const transactionGroups =
      response.aggregations?.transaction_groups.buckets.map((bucket) => {
        const errorRate = calculateTransactionErrorPercentage(
          bucket[EVENT_OUTCOME]
        );

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
    };
  });
}
