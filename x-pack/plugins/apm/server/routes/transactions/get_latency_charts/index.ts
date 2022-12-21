/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  kqlQuery,
  rangeQuery,
  termQuery,
} from '@kbn/observability-plugin/server';
import {
  FAAS_ID,
  SERVICE_NAME,
  TRANSACTION_NAME,
  TRANSACTION_TYPE,
} from '../../../../common/es_fields/apm';
import { LatencyAggregationType } from '../../../../common/latency_aggregation_types';
import { offsetPreviousPeriodCoordinates } from '../../../../common/utils/offset_previous_period_coordinate';
import { environmentQuery } from '../../../../common/utils/environment_query';
import {
  getDocumentTypeFilterForTransactions,
  getDurationFieldForTransactions,
  getProcessorEventForTransactions,
} from '../../../lib/helpers/transactions';
import { getBucketSizeForAggregatedTransactions } from '../../../lib/helpers/get_bucket_size_for_aggregated_transactions';
import {
  getLatencyAggregation,
  getLatencyValue,
} from '../../../lib/helpers/latency_aggregation_type';
import { getOffsetInMs } from '../../../../common/utils/get_offset_in_ms';
import { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';

export type LatencyChartsSearchResponse = Awaited<
  ReturnType<typeof searchLatency>
>;

function searchLatency({
  environment,
  kuery,
  serviceName,
  transactionType,
  transactionName,
  apmEventClient,
  searchAggregatedTransactions,
  latencyAggregationType,
  start,
  end,
  offset,
  serverlessId,
}: {
  environment: string;
  kuery: string;
  serviceName: string;
  transactionType: string | undefined;
  transactionName: string | undefined;
  apmEventClient: APMEventClient;
  searchAggregatedTransactions: boolean;
  latencyAggregationType: LatencyAggregationType;
  start: number;
  end: number;
  offset?: string;
  serverlessId?: string;
}) {
  const { startWithOffset, endWithOffset } = getOffsetInMs({
    start,
    end,
    offset,
  });

  const { intervalString } = getBucketSizeForAggregatedTransactions({
    start: startWithOffset,
    end: endWithOffset,
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
      track_total_hits: false,
      size: 0,
      query: {
        bool: {
          filter: [
            { term: { [SERVICE_NAME]: serviceName } },
            ...getDocumentTypeFilterForTransactions(
              searchAggregatedTransactions
            ),
            ...rangeQuery(startWithOffset, endWithOffset),
            ...environmentQuery(environment),
            ...kqlQuery(kuery),
            ...termQuery(TRANSACTION_NAME, transactionName),
            ...termQuery(TRANSACTION_TYPE, transactionType),
            ...termQuery(FAAS_ID, serverlessId),
          ],
        },
      },
      aggs: {
        latencyTimeseries: {
          date_histogram: {
            field: '@timestamp',
            fixed_interval: intervalString,
            min_doc_count: 0,
            extended_bounds: { min: startWithOffset, max: endWithOffset },
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
  apmEventClient,
  searchAggregatedTransactions,
  latencyAggregationType,
  start,
  end,
  offset,
  serverlessId,
}: {
  environment: string;
  kuery: string;
  serviceName: string;
  transactionType?: string;
  transactionName?: string;
  apmEventClient: APMEventClient;
  searchAggregatedTransactions: boolean;
  latencyAggregationType: LatencyAggregationType;
  start: number;
  end: number;
  offset?: string;
  serverlessId?: string;
}) {
  const response = await searchLatency({
    environment,
    kuery,
    serviceName,
    transactionType,
    transactionName,
    apmEventClient,
    searchAggregatedTransactions,
    latencyAggregationType,
    start,
    end,
    offset,
    serverlessId,
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
  apmEventClient,
  searchAggregatedTransactions,
  latencyAggregationType,
  kuery,
  environment,
  start,
  end,
  offset,
}: {
  serviceName: string;
  transactionType: string | undefined;
  transactionName: string | undefined;
  apmEventClient: APMEventClient;
  searchAggregatedTransactions: boolean;
  latencyAggregationType: LatencyAggregationType;
  kuery: string;
  environment: string;
  start: number;
  end: number;
  offset?: string;
}) {
  const options = {
    serviceName,
    transactionType,
    transactionName,
    apmEventClient,
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

  const previousPeriodPromise = offset
    ? getLatencyTimeseries({
        ...options,
        start,
        end,
        offset,
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
