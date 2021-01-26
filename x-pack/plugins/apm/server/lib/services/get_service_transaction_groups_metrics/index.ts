/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EVENT_OUTCOME,
  SERVICE_NAME,
  TRANSACTION_NAME,
  TRANSACTION_TYPE,
} from '../../../../common/elasticsearch_fieldnames';
import { EventOutcome } from '../../../../common/event_outcome';
import { LatencyAggregationType } from '../../../../common/latency_aggregation_types';
import { rangeFilter } from '../../../../common/utils/range_filter';
import { Coordinate } from '../../../../typings/timeseries';
import {
  getProcessorEventForAggregatedTransactions,
  getTransactionDurationFieldForAggregatedTransactions,
} from '../../helpers/aggregated_transactions';
import { getBucketSize } from '../../helpers/get_bucket_size';
import {
  getLatencyAggregation,
  getLatencyValue,
} from '../../helpers/latency_aggregation_type';
import { Setup, SetupTimeRange } from '../../helpers/setup_request';

export async function getServiceTransactionGroupsMetrics({
  serviceName,
  transactionNames,
  setup,
  numBuckets,
  searchAggregatedTransactions,
  transactionType,
  latencyAggregationType,
}: {
  serviceName: string;
  transactionNames: string[];
  setup: Setup & SetupTimeRange;
  numBuckets: number;
  searchAggregatedTransactions: boolean;
  transactionType: string;
  latencyAggregationType: LatencyAggregationType;
}): Promise<
  Record<
    string,
    {
      latency: Coordinate[];
      throughput: Coordinate[];
      errorRate: Coordinate[];
    }
  >
> {
  const { apmEventClient, start, end, esFilter } = setup;
  const deltaAsMinutes = (end - start) / 1000 / 60;

  const { intervalString } = getBucketSize({ start, end, numBuckets });

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
            { terms: { [TRANSACTION_NAME]: transactionNames } },
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
            size: transactionNames.length,
          },
          aggs: {
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
      },
    },
  });

  const buckets = response.aggregations?.transaction_groups.buckets ?? [];

  return buckets.reduce((acc, bucket) => {
    const transactionName = bucket.key;

    const latency: Coordinate[] = bucket.timeseries.buckets.map(
      (timeseriesBucket) => ({
        x: timeseriesBucket.key,
        y: getLatencyValue({
          latencyAggregationType,
          aggregation: timeseriesBucket.latency,
        }),
      })
    );

    const throughput: Coordinate[] = bucket.timeseries.buckets.map(
      (timeseriesBucket) => ({
        x: timeseriesBucket.key,
        y: timeseriesBucket.transaction_count.value / deltaAsMinutes,
      })
    );

    const errorRate: Coordinate[] = bucket.timeseries.buckets.map(
      (timeseriesBucket) => ({
        x: timeseriesBucket.key,
        y:
          timeseriesBucket.transaction_count.value > 0
            ? (timeseriesBucket[EVENT_OUTCOME].transaction_count.value ?? 0) /
              timeseriesBucket.transaction_count.value
            : null,
      })
    );

    return {
      ...acc,
      [transactionName]: { latency, throughput, errorRate },
    };
  }, {});
}
