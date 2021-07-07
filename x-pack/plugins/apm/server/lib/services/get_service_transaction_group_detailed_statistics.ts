/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { keyBy } from 'lodash';
import {
  EVENT_OUTCOME,
  SERVICE_NAME,
  TRANSACTION_NAME,
  TRANSACTION_TYPE,
} from '../../../common/elasticsearch_fieldnames';
import { EventOutcome } from '../../../common/event_outcome';
import { LatencyAggregationType } from '../../../common/latency_aggregation_types';
import { offsetPreviousPeriodCoordinates } from '../../../common/utils/offset_previous_period_coordinate';
import {
  environmentQuery,
  kqlQuery,
  rangeQuery,
} from '../../../server/utils/queries';
import { Coordinate } from '../../../typings/timeseries';
import {
  getDocumentTypeFilterForAggregatedTransactions,
  getProcessorEventForAggregatedTransactions,
  getTransactionDurationFieldForAggregatedTransactions,
} from '../helpers/aggregated_transactions';
import { getBucketSizeForAggregatedTransactions } from '../helpers/get_bucket_size_for_aggregated_transactions';
import {
  getLatencyAggregation,
  getLatencyValue,
} from '../helpers/latency_aggregation_type';
import { Setup, SetupTimeRange } from '../helpers/setup_request';
import { calculateTransactionErrorPercentage } from '../helpers/transaction_error_rate';

export async function getServiceTransactionGroupDetailedStatistics({
  environment,
  kuery,
  serviceName,
  transactionNames,
  setup,
  numBuckets,
  searchAggregatedTransactions,
  transactionType,
  latencyAggregationType,
  start,
  end,
}: {
  environment?: string;
  kuery?: string;
  serviceName: string;
  transactionNames: string[];
  setup: Setup;
  numBuckets: number;
  searchAggregatedTransactions: boolean;
  transactionType: string;
  latencyAggregationType: LatencyAggregationType;
  start: number;
  end: number;
}): Promise<
  Array<{
    transactionName: string;
    latency: Coordinate[];
    throughput: Coordinate[];
    errorRate: Coordinate[];
    impact: number;
  }>
> {
  const { apmEventClient } = setup;
  const { intervalString } = getBucketSizeForAggregatedTransactions({
    start,
    end,
    numBuckets,
    searchAggregatedTransactions,
  });

  const field = getTransactionDurationFieldForAggregatedTransactions(
    searchAggregatedTransactions
  );

  const response = await apmEventClient.search(
    'get_service_transaction_group_detailed_statistics',
    {
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
              ...kqlQuery(kuery),
            ],
          },
        },
        aggs: {
          total_duration: { sum: { field } },
          transaction_groups: {
            terms: {
              field: TRANSACTION_NAME,
              include: transactionNames,
              size: transactionNames.length,
            },
            aggs: {
              transaction_group_total_duration: {
                sum: { field },
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
                      unit: 'minute',
                    },
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
        },
      },
    }
  );

  const buckets = response.aggregations?.transaction_groups.buckets ?? [];

  const totalDuration = response.aggregations?.total_duration.value;
  return buckets.map((bucket) => {
    const transactionName = bucket.key as string;
    const latency = bucket.timeseries.buckets.map((timeseriesBucket) => ({
      x: timeseriesBucket.key,
      y: getLatencyValue({
        latencyAggregationType,
        aggregation: timeseriesBucket.latency,
      }),
    }));
    const throughput = bucket.timeseries.buckets.map((timeseriesBucket) => ({
      x: timeseriesBucket.key,
      y: timeseriesBucket.throughput_rate.value,
    }));
    const errorRate = bucket.timeseries.buckets.map((timeseriesBucket) => ({
      x: timeseriesBucket.key,
      y: calculateTransactionErrorPercentage(timeseriesBucket[EVENT_OUTCOME]),
    }));
    const transactionGroupTotalDuration =
      bucket.transaction_group_total_duration.value || 0;
    return {
      transactionName,
      latency,
      throughput,
      errorRate,
      impact: totalDuration
        ? (transactionGroupTotalDuration * 100) / totalDuration
        : 0,
    };
  });
}

export async function getServiceTransactionGroupDetailedStatisticsPeriods({
  serviceName,
  transactionNames,
  setup,
  numBuckets,
  searchAggregatedTransactions,
  transactionType,
  latencyAggregationType,
  comparisonStart,
  comparisonEnd,
  environment,
  kuery,
}: {
  serviceName: string;
  transactionNames: string[];
  setup: Setup & SetupTimeRange;
  numBuckets: number;
  searchAggregatedTransactions: boolean;
  transactionType: string;
  latencyAggregationType: LatencyAggregationType;
  comparisonStart?: number;
  comparisonEnd?: number;
  environment?: string;
  kuery?: string;
}) {
  const { start, end } = setup;

  const commonProps = {
    setup,
    serviceName,
    transactionNames,
    searchAggregatedTransactions,
    transactionType,
    numBuckets,
    latencyAggregationType: latencyAggregationType as LatencyAggregationType,
    environment,
    kuery,
  };

  const currentPeriodPromise = getServiceTransactionGroupDetailedStatistics({
    ...commonProps,
    start,
    end,
  });

  const previousPeriodPromise =
    comparisonStart && comparisonEnd
      ? getServiceTransactionGroupDetailedStatistics({
          ...commonProps,
          start: comparisonStart,
          end: comparisonEnd,
        })
      : [];

  const [currentPeriod, previousPeriod] = await Promise.all([
    currentPeriodPromise,
    previousPeriodPromise,
  ]);

  const firtCurrentPeriod = currentPeriod.length ? currentPeriod[0] : undefined;

  return {
    currentPeriod: keyBy(currentPeriod, 'transactionName'),
    previousPeriod: keyBy(
      previousPeriod.map((data) => {
        return {
          ...data,
          errorRate: offsetPreviousPeriodCoordinates({
            currentPeriodTimeseries: firtCurrentPeriod?.errorRate,
            previousPeriodTimeseries: data.errorRate,
          }),
          throughput: offsetPreviousPeriodCoordinates({
            currentPeriodTimeseries: firtCurrentPeriod?.throughput,
            previousPeriodTimeseries: data.throughput,
          }),
          latency: offsetPreviousPeriodCoordinates({
            currentPeriodTimeseries: firtCurrentPeriod?.latency,
            previousPeriodTimeseries: data.latency,
          }),
        };
      }),
      'transactionName'
    ),
  };
}
