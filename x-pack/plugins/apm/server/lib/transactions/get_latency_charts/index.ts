/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { offsetPreviousPeriodCoordinates } from '../../../../common/utils/offset_previous_period_coordinate';
import { ESFilter } from '../../../../../../../typings/elasticsearch';
import { PromiseReturnType } from '../../../../../observability/typings/common';
import {
  SERVICE_NAME,
  TRANSACTION_NAME,
  TRANSACTION_TYPE,
} from '../../../../common/elasticsearch_fieldnames';
import { LatencyAggregationType } from '../../../../common/latency_aggregation_types';
import {
  environmentQuery,
  rangeQuery,
  kqlQuery,
} from '../../../../server/utils/queries';
import {
  getDocumentTypeFilterForAggregatedTransactions,
  getProcessorEventForAggregatedTransactions,
  getTransactionDurationFieldForAggregatedTransactions,
} from '../../../lib/helpers/aggregated_transactions';
import { getBucketSize } from '../../../lib/helpers/get_bucket_size';
import { Setup, SetupTimeRange } from '../../../lib/helpers/setup_request';
import {
  getLatencyAggregation,
  getLatencyValue,
} from '../../helpers/latency_aggregation_type';
export type LatencyChartsSearchResponse = PromiseReturnType<
  typeof searchLatency
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
  environment?: string;
  kuery?: string;
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
  const { intervalString } = getBucketSize({ start, end });

  const filter: ESFilter[] = [
    { term: { [SERVICE_NAME]: serviceName } },
    ...getDocumentTypeFilterForAggregatedTransactions(
      searchAggregatedTransactions
    ),
    ...rangeQuery(start, end),
    ...environmentQuery(environment),
    ...kqlQuery(kuery),
  ];

  if (transactionName) {
    filter.push({ term: { [TRANSACTION_NAME]: transactionName } });
  }

  if (transactionType) {
    filter.push({ term: { [TRANSACTION_TYPE]: transactionType } });
  }

  const transactionDurationField = getTransactionDurationFieldForAggregatedTransactions(
    searchAggregatedTransactions
  );

  const params = {
    apm: {
      events: [
        getProcessorEventForAggregatedTransactions(
          searchAggregatedTransactions
        ),
      ],
    },
    body: {
      size: 0,
      query: { bool: { filter } },
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
  environment?: string;
  kuery?: string;
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
}: {
  serviceName: string;
  transactionType: string | undefined;
  transactionName: string | undefined;
  setup: Setup & SetupTimeRange;
  searchAggregatedTransactions: boolean;
  latencyAggregationType: LatencyAggregationType;
  comparisonStart?: number;
  comparisonEnd?: number;
  kuery?: string;
}) {
  const { start, end } = setup;
  const options = {
    serviceName,
    transactionType,
    transactionName,
    setup,
    searchAggregatedTransactions,
    kuery,
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
          latencyAggregationType: latencyAggregationType as LatencyAggregationType,
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
