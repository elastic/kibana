/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SERVICE_NAME,
  TRANSACTION_NAME,
  TRANSACTION_TYPE,
} from '../../../../common/elasticsearch_fieldnames';
import { LatencyAggregationType } from '../../../../common/latency_aggregation_types';
import { offsetPreviousPeriodCoordinates } from '../../../../common/utils/offset_previous_period_coordinate';
import {
  kqlQuery,
  rangeQuery,
  termQuery,
} from '../../../../../observability/server';
import { environmentQuery } from '../../../../common/utils/environment_query';
import {
  getDocumentTypeFilterForTransactions,
  getDurationFieldForTransactions,
  getProcessorEventForTransactions,
} from '../../../lib/helpers/transactions';
import { Setup } from '../../../lib/helpers/setup_request';
import { getBucketSizeForAggregatedTransactions } from '../../../lib/helpers/get_bucket_size_for_aggregated_transactions';
import {
  getLatencyAggregation,
  getLatencyValue,
} from '../../../lib/helpers/latency_aggregation_type';
export type LatencyChartsSearchResponse = Awaited<
  ReturnType<typeof searchLatency>
>;

function searchLatency({
  environment,
  kuery,
  serviceName,
  transactionType,
  transactionName,
  setup,
  searchAggregatedTransactions,
  latencyAggregationType,
  start,
  end,
}: {
  environment: string;
  kuery: string;
  serviceName: string;
  transactionType: string | undefined;
  transactionName: string | undefined;
  setup: Setup;
  searchAggregatedTransactions: boolean;
  latencyAggregationType: LatencyAggregationType;
  start: number;
  end: number;
}) {
  const { apmEventClient } = setup;
  const { intervalString } = getBucketSizeForAggregatedTransactions({
    start,
    end,
    searchAggregatedTransactions,
  });

  const transactionDurationField = getDurationFieldForTransactions(
    searchAggregatedTransactions
  );

  const params = {
    apm: {
      events: [getProcessorEventForTransactions(searchAggregatedTransactions)],
    },
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            { term: { [SERVICE_NAME]: serviceName } },
            ...getDocumentTypeFilterForTransactions(
              searchAggregatedTransactions
            ),
            ...rangeQuery(start, end),
            ...environmentQuery(environment),
            ...kqlQuery(kuery),
            ...termQuery(TRANSACTION_NAME, transactionName),
            ...termQuery(TRANSACTION_TYPE, transactionType),
          ],
        },
      },
      aggs: {
        latencyTimeseries: {
          date_histogram: {
            field: '@timestamp',
            fixed_interval: intervalString,
            min_doc_count: 0,
            extended_bounds: { min: start, max: end },
          },
          aggs: getLatencyAggregation(
            latencyAggregationType,
            transactionDurationField
          ),
        },
        overall_avg_duration: { avg: { field: transactionDurationField } },
      },
    },
  };

  return apmEventClient.search('get_latency_charts', params);
}

export async function getLatencyTimeseries({
  environment,
  kuery,
  serviceName,
  transactionType,
  transactionName,
  setup,
  searchAggregatedTransactions,
  latencyAggregationType,
  start,
  end,
}: {
  environment: string;
  kuery: string;
  serviceName: string;
  transactionType: string | undefined;
  transactionName: string | undefined;
  setup: Setup;
  searchAggregatedTransactions: boolean;
  latencyAggregationType: LatencyAggregationType;
  start: number;
  end: number;
}) {
  const response = await searchLatency({
    environment,
    kuery,
    serviceName,
    transactionType,
    transactionName,
    setup,
    searchAggregatedTransactions,
    latencyAggregationType,
    start,
    end,
  });

  if (!response.aggregations) {
    return { latencyTimeseries: [], overallAvgDuration: null };
  }

  return {
    overallAvgDuration:
      response.aggregations.overall_avg_duration.value || null,
    latencyTimeseries: response.aggregations.latencyTimeseries.buckets.map(
      (bucket) => {
        return {
          x: bucket.key,
          y: getLatencyValue({
            latencyAggregationType,
            aggregation: bucket.latency,
          }),
        };
      }
    ),
  };
}

export async function getLatencyPeriods({
  serviceName,
  transactionType,
  transactionName,
  setup,
  searchAggregatedTransactions,
  latencyAggregationType,
  comparisonStart,
  comparisonEnd,
  kuery,
  environment,
  start,
  end,
}: {
  serviceName: string;
  transactionType: string | undefined;
  transactionName: string | undefined;
  setup: Setup;
  searchAggregatedTransactions: boolean;
  latencyAggregationType: LatencyAggregationType;
  comparisonStart?: number;
  comparisonEnd?: number;
  kuery: string;
  environment: string;
  start: number;
  end: number;
}) {
  const options = {
    serviceName,
    transactionType,
    transactionName,
    setup,
    searchAggregatedTransactions,
    kuery,
    environment,
  };

  const currentPeriodPromise = getLatencyTimeseries({
    ...options,
    start,
    end,
    latencyAggregationType: latencyAggregationType as LatencyAggregationType,
  });

  const previousPeriodPromise =
    comparisonStart && comparisonEnd
      ? getLatencyTimeseries({
          ...options,
          start: comparisonStart,
          end: comparisonEnd,
          latencyAggregationType:
            latencyAggregationType as LatencyAggregationType,
        })
      : { latencyTimeseries: [], overallAvgDuration: null };

  const [currentPeriod, previousPeriod] = await Promise.all([
    currentPeriodPromise,
    previousPeriodPromise,
  ]);

  return {
    currentPeriod,
    previousPeriod: {
      ...previousPeriod,
      latencyTimeseries: offsetPreviousPeriodCoordinates({
        currentPeriodTimeseries: currentPeriod.latencyTimeseries,
        previousPeriodTimeseries: previousPeriod.latencyTimeseries,
      }),
    },
  };
}
