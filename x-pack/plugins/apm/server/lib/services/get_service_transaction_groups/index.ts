/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { orderBy } from 'lodash';
import {
  TRANSACTION_PAGE_LOAD,
  TRANSACTION_REQUEST,
} from '../../../../common/transaction_types';
import { EventOutcome } from '../../../../common/event_outcome';
import { rangeFilter } from '../../../../common/utils/range_filter';
import {
  EVENT_OUTCOME,
  SERVICE_NAME,
  TRANSACTION_NAME,
  TRANSACTION_TYPE,
} from '../../../../common/elasticsearch_fieldnames';
import { Setup, SetupTimeRange } from '../../helpers/setup_request';
import { getBucketSize } from '../../helpers/get_bucket_size';
import {
  getProcessorEventForAggregatedTransactions,
  getTransactionDurationFieldForAggregatedTransactions,
} from '../../helpers/aggregated_transactions';

export async function getServiceTransactionGroups({
  serviceName,
  setup,
  size,
  numBuckets,
  pageIndex,
  sortDirection,
  sortField,
  searchAggregatedTransactions,
}: {
  serviceName: string;
  setup: Setup & SetupTimeRange;
  size: number;
  pageIndex: number;
  numBuckets: number;
  sortDirection: 'asc' | 'desc';
  sortField: 'latency' | 'traffic' | 'error_rate' | 'impact';
  searchAggregatedTransactions: boolean;
}) {
  const { apmEventClient, start, end, esFilter } = setup;

  const { intervalString } = getBucketSize(start, end, numBuckets);

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
            order: {
              _count: 'desc',
            },
          },
          aggs: {
            avg_latency: {
              avg: {
                field: getTransactionDurationFieldForAggregatedTransactions(
                  searchAggregatedTransactions
                ),
              },
            },
            transaction_count: {
              value_count: {
                field: getTransactionDurationFieldForAggregatedTransactions(
                  searchAggregatedTransactions
                ),
              },
            },
            [EVENT_OUTCOME]: {
              terms: {
                field: EVENT_OUTCOME,
              },
              aggs: {
                transaction_count: {
                  value_count: {
                    field: getTransactionDurationFieldForAggregatedTransactions(
                      searchAggregatedTransactions
                    ),
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  const transactionGroups =
    response.aggregations?.transaction_groups.buckets.map((bucket) => ({
      name: bucket.key as string,
      latency: bucket.avg_latency.value,
      traffic: bucket.transaction_count.value,
      error_rate:
        bucket.transaction_count.value > 0
          ? (bucket[EVENT_OUTCOME].buckets.find(
              (outcomeBucket) => outcomeBucket.key === EventOutcome.failure
            )?.transaction_count.value ?? 0) / bucket.transaction_count.value
          : null,
    })) ?? [];

  const totalDurationValues = transactionGroups.map(
    (group) => (group.latency ?? 0) * group.traffic
  );

  const minTotalDuration = Math.min(...totalDurationValues);
  const maxTotalDuration = Math.max(...totalDurationValues);

  const transactionGroupsWithImpact = transactionGroups.map((group) => ({
    ...group,
    impact:
      (((group.latency ?? 0) * group.traffic - minTotalDuration) /
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

  const sortedTransactionGroupNames = sortedAndSlicedTransactionGroups.map(
    (group) => group.name
  );

  const timeseriesResponse = await apmEventClient.search({
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
            { terms: { [TRANSACTION_NAME]: sortedTransactionGroupNames } },
            { term: { [SERVICE_NAME]: serviceName } },
            { range: rangeFilter(start, end) },
            ...esFilter,
          ],
        },
      },
      aggs: {
        transaction_groups: {
          terms: {
            field: TRANSACTION_NAME,
            size,
          },
          aggs: {
            transaction_types: {
              terms: {
                field: TRANSACTION_TYPE,
              },
            },
            timeseries: {
              date_histogram: {
                field: '@timestamp',
                fixed_interval: intervalString,
                min_doc_count: 0,
                extended_bounds: {
                  min: start,
                  max: end,
                },
              },
              aggs: {
                avg_latency: {
                  avg: {
                    field: getTransactionDurationFieldForAggregatedTransactions(
                      searchAggregatedTransactions
                    ),
                  },
                },
                transaction_count: {
                  value_count: {
                    field: getTransactionDurationFieldForAggregatedTransactions(
                      searchAggregatedTransactions
                    ),
                  },
                },
                [EVENT_OUTCOME]: {
                  terms: {
                    field: EVENT_OUTCOME,
                  },
                  aggs: {
                    transaction_count: {
                      value_count: {
                        field: getTransactionDurationFieldForAggregatedTransactions(
                          searchAggregatedTransactions
                        ),
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  const deltaAsMinutes = (end - start) / 1000 / 60;

  const transactionGroupsWithAllData = sortedAndSlicedTransactionGroups.map(
    (transactionGroup) => {
      const groupBucket = timeseriesResponse.aggregations?.transaction_groups.buckets.find(
        ({ key }) => key === transactionGroup.name
      );

      const transactionTypes =
        groupBucket?.transaction_types.buckets.map(
          (bucket) => bucket.key as string
        ) ?? [];

      const transactionType =
        transactionTypes.find(
          (type) =>
            type === TRANSACTION_PAGE_LOAD || type === TRANSACTION_REQUEST
        ) ?? transactionTypes[0];

      const timeseriesBuckets = groupBucket?.timeseries.buckets ?? [];

      return timeseriesBuckets.reduce(
        (prev, point) => {
          return {
            ...prev,
            latency: {
              ...prev.latency,
              timeseries: prev.latency.timeseries.concat({
                x: point.key,
                y: point.avg_latency.value,
              }),
            },
            traffic: {
              ...prev.traffic,
              timeseries: prev.traffic.timeseries.concat({
                x: point.key,
                y: point.transaction_count.value / deltaAsMinutes,
              }),
            },
            error_rate: {
              ...prev.error_rate,
              timeseries: prev.error_rate.timeseries.concat({
                x: point.key,
                y:
                  point.transaction_count.value > 0
                    ? (point[EVENT_OUTCOME].buckets.find(
                        (outcomeBucket) =>
                          outcomeBucket.key === EventOutcome.failure
                      )?.transaction_count.value ?? 0) /
                      point.transaction_count.value
                    : null,
              }),
            },
          };
        },
        {
          name: transactionGroup.name,
          transaction_type: transactionType,
          latency: {
            value: transactionGroup.latency,
            timeseries: [] as Array<{ x: number; y: number | null }>,
          },
          traffic: {
            value: transactionGroup.traffic,
            timeseries: [] as Array<{ x: number; y: number }>,
          },
          error_rate: {
            value: transactionGroup.error_rate,
            timeseries: [] as Array<{ x: number; y: number | null }>,
          },
          impact: transactionGroup.impact,
        }
      );
    }
  );

  return {
    total_transaction_groups: transactionGroups.length,
    is_aggregation_accurate:
      (response.aggregations?.transaction_groups.sum_other_doc_count ?? 0) ===
      0,
    transaction_groups: transactionGroupsWithAllData,
  };
}
