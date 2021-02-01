/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { sortBy } from 'lodash';
import uuid from 'uuid';
import {
  EVENT_OUTCOME,
  SERVICE_NAME,
  TRANSACTION_DURATION,
  TRANSACTION_NAME,
  TRANSACTION_TYPE,
} from '../../../common/elasticsearch_fieldnames';
import { EventOutcome } from '../../../common/event_outcome';
import { LatencyAggregationType } from '../../../common/latency_aggregation_types';
import { rangeFilter } from '../../../common/utils/range_filter';
import {
  getProcessorEventForAggregatedTransactions,
  getTransactionDurationFieldForAggregatedTransactions,
} from '../helpers/aggregated_transactions';
import {
  getLatencyAggregation,
  getLatencyValue,
} from '../helpers/latency_aggregation_type';
import { Setup, SetupTimeRange } from '../helpers/setup_request';

export async function getServiceTransactionGroups({
  serviceName,
  setup,
  searchAggregatedTransactions,
  transactionType,
  latencyAggregationType,
}: {
  serviceName: string;
  setup: Setup & SetupTimeRange;
  searchAggregatedTransactions: boolean;
  transactionType: string;
  latencyAggregationType: LatencyAggregationType;
}) {
  const { apmEventClient, start, end, esFilter } = setup;
  const deltaAsMinutes = (end - start) / 1000 / 60;

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
            { range: rangeFilter(start, end) },
            ...esFilter,
          ],
        },
      },
      aggs: {
        total_duration: { sum: { field: TRANSACTION_DURATION } },
        transaction_groups: {
          terms: {
            field: TRANSACTION_NAME,
            size: 500,
            order: { _count: 'desc' },
          },
          aggs: {
            transaction_group_total_duration: {
              sum: { field: TRANSACTION_DURATION },
            },
            ...getLatencyAggregation(latencyAggregationType, field),
            transaction_count: { value_count: { field } },
            [EVENT_OUTCOME]: {
              filter: { term: { [EVENT_OUTCOME]: EventOutcome.failure } },
              aggs: { transaction_count: { value_count: { field } } },
            },
          },
        },
      },
    },
  });

  const totalDuration = response.aggregations?.total_duration.value;

  const transactionGroups =
    response.aggregations?.transaction_groups.buckets.map((bucket) => {
      const errorRate =
        bucket.transaction_count.value > 0
          ? (bucket[EVENT_OUTCOME].transaction_count.value ?? 0) /
            bucket.transaction_count.value
          : null;

      const transactionGroupTotalDuration =
        bucket.transaction_group_total_duration.value || 0;

      return {
        name: bucket.key as string,
        latency: getLatencyValue({
          latencyAggregationType,
          aggregation: bucket.latency,
        }),
        throughput: bucket.transaction_count.value / deltaAsMinutes,
        errorRate,
        impact: totalDuration
          ? (transactionGroupTotalDuration * 100) / totalDuration
          : 0,
      };
    }) ?? [];

  // By default sorts transactions by impact
  const sortedTransactionGroups = sortBy(transactionGroups, 'impact').reverse();

  return {
    requestId: uuid(),
    transactionGroups: sortedTransactionGroups.map((transactionGroup) => ({
      ...transactionGroup,
      transactionType,
    })),
    isAggregationAccurate:
      (response.aggregations?.transaction_groups.sum_other_doc_count ?? 0) ===
      0,
  };
}
