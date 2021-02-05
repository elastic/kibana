/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
import { Coordinate } from '../../../typings/timeseries';
import {
  getDocumentTypeFilterForAggregatedTransactions,
  getProcessorEventForAggregatedTransactions,
  getTransactionDurationFieldForAggregatedTransactions,
} from '../helpers/aggregated_transactions';
import { getBucketSize } from '../helpers/get_bucket_size';
import {
  getLatencyAggregation,
  getLatencyValue,
} from '../helpers/latency_aggregation_type';
import { Setup, SetupTimeRange } from '../helpers/setup_request';

export async function getServiceTransactionGroupsStatistics({
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
      impact: number;
    }
  >
> {
  const { apmEventClient, start, end, esFilter } = setup;
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
            { term: { [SERVICE_NAME]: serviceName } },
            { term: { [TRANSACTION_TYPE]: transactionType } },
            { range: rangeFilter(start, end) },
            ...getDocumentTypeFilterForAggregatedTransactions(
              searchAggregatedTransactions
            ),
            ...esFilter,
          ],
        },
      },
      aggs: {
        total_duration: { sum: { field: TRANSACTION_DURATION } },
        transaction_groups: {
          terms: {
            field: TRANSACTION_NAME,
            include: transactionNames,
            size: transactionNames.length,
          },
          aggs: {
            transaction_group_total_duration: {
              sum: { field: TRANSACTION_DURATION },
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
                throughput_rate: {
                  rate: {
                    field: TRANSACTION_DURATION,
                    unit: 'minute',
                    mode: 'value_count',
                  },
                },
                ...getLatencyAggregation(latencyAggregationType, field),
                [EVENT_OUTCOME]: {
                  filter: {
                    term: { [EVENT_OUTCOME]: EventOutcome.failure },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  const buckets = response.aggregations?.transaction_groups.buckets ?? [];

  const totalDuration = response.aggregations?.total_duration.value;

  return buckets.reduce((acc, bucket) => {
    const transactionName = bucket.key;

    const latency = bucket.timeseries.buckets.map((timeseriesBucket) => ({
      x: timeseriesBucket.key,
      y: getLatencyValue({
        latencyAggregationType,
        aggregation: timeseriesBucket.latency,
      }),
    }));

    const throughput = bucket.timeseries.buckets.map((timeseriesBucket) => ({
      x: timeseriesBucket.key,
      y:
        timeseriesBucket.throughput_rate.value !== null
          ? timeseriesBucket.throughput_rate.value / 100
          : null,
    }));

    const errorRate = bucket.timeseries.buckets.map((timeseriesBucket) => ({
      x: timeseriesBucket.key,
      y:
        timeseriesBucket.doc_count > 0
          ? timeseriesBucket[EVENT_OUTCOME].doc_count /
            timeseriesBucket.doc_count
          : null,
    }));

    const transactionGroupTotalDuration =
      bucket.transaction_group_total_duration.value || 0;

    return {
      ...acc,
      [transactionName]: {
        latency,
        throughput,
        errorRate,
        impact: totalDuration
          ? (transactionGroupTotalDuration * 100) / totalDuration
          : 0,
      },
    };
  }, {});
}
