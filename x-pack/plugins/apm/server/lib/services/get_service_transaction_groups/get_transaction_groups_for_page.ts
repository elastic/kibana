/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { orderBy } from 'lodash';
import { ValuesType } from 'utility-types';
import { LatencyAggregationType } from '../../../../common/latency_aggregation_types';
import { PromiseReturnType } from '../../../../../observability/typings/common';
import { EventOutcome } from '../../../../common/event_outcome';
import { ESFilter } from '../../../../../../typings/elasticsearch';
import { rangeFilter } from '../../../../common/utils/range_filter';
import {
  EVENT_OUTCOME,
  SERVICE_NAME,
  TRANSACTION_NAME,
  TRANSACTION_TYPE,
} from '../../../../common/elasticsearch_fieldnames';
import {
  getProcessorEventForAggregatedTransactions,
  getTransactionDurationFieldForAggregatedTransactions,
} from '../../helpers/aggregated_transactions';
import { APMEventClient } from '../../helpers/create_es_client/create_apm_event_client';
import {
  getLatencyAggregation,
  getLatencyValue,
} from '../../helpers/latency_aggregation_type';

export type ServiceOverviewTransactionGroupSortField =
  | 'name'
  | 'latency'
  | 'throughput'
  | 'errorRate'
  | 'impact';

export type TransactionGroupWithoutTimeseriesData = ValuesType<
  PromiseReturnType<typeof getTransactionGroupsForPage>['transactionGroups']
>;

export async function getTransactionGroupsForPage({
  apmEventClient,
  searchAggregatedTransactions,
  serviceName,
  start,
  end,
  esFilter,
  sortField,
  sortDirection,
  pageIndex,
  size,
  transactionType,
  latencyAggregationType,
}: {
  apmEventClient: APMEventClient;
  searchAggregatedTransactions: boolean;
  serviceName: string;
  start: number;
  end: number;
  esFilter: ESFilter[];
  sortField: ServiceOverviewTransactionGroupSortField;
  sortDirection: 'asc' | 'desc';
  pageIndex: number;
  size: number;
  transactionType: string;
  latencyAggregationType: LatencyAggregationType;
}) {
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
        transaction_groups: {
          terms: {
            field: TRANSACTION_NAME,
            size: 500,
            order: { _count: 'desc' },
          },
          aggs: {
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

  const transactionGroups =
    response.aggregations?.transaction_groups.buckets.map((bucket) => {
      const errorRate =
        bucket.transaction_count.value > 0
          ? (bucket[EVENT_OUTCOME].transaction_count.value ?? 0) /
            bucket.transaction_count.value
          : null;

      return {
        name: bucket.key as string,
        latency: getLatencyValue({
          latencyAggregationType,
          aggregation: bucket.latency,
        }),
        throughput: bucket.transaction_count.value / deltaAsMinutes,
        errorRate,
      };
    }) ?? [];

  const totalDurationValues = transactionGroups.map(
    (group) => (group.latency ?? 0) * group.throughput
  );

  const minTotalDuration = Math.min(...totalDurationValues);
  const maxTotalDuration = Math.max(...totalDurationValues);

  const transactionGroupsWithImpact = transactionGroups.map((group) => ({
    ...group,
    impact:
      (((group.latency ?? 0) * group.throughput - minTotalDuration) /
        (maxTotalDuration - minTotalDuration)) *
      100,
  }));

  // Sort transaction groups first, and only get timeseries for data in view.
  // This is to limit the possibility of creating too many buckets.

  const sortedAndSlicedTransactionGroups = orderBy(
    transactionGroupsWithImpact,
    sortField,
    [sortDirection]
  ).slice(pageIndex * size, pageIndex * size + size);

  return {
    transactionGroups: sortedAndSlicedTransactionGroups,
    totalTransactionGroups: transactionGroups.length,
    isAggregationAccurate:
      (response.aggregations?.transaction_groups.sum_other_doc_count ?? 0) ===
      0,
  };
}
