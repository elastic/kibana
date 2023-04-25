/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kqlQuery, rangeQuery } from '@kbn/observability-plugin/server';
import { keyBy } from 'lodash';
import { ApmTransactionDocumentType } from '../../../common/document_type';
import {
  SERVICE_NAME,
  TRANSACTION_NAME,
  TRANSACTION_TYPE,
} from '../../../common/es_fields/apm';
import { LatencyAggregationType } from '../../../common/latency_aggregation_types';
import { environmentQuery } from '../../../common/utils/environment_query';
import { getOffsetInMs } from '../../../common/utils/get_offset_in_ms';
import { offsetPreviousPeriodCoordinates } from '../../../common/utils/offset_previous_period_coordinate';
import { Coordinate } from '../../../typings/timeseries';
import { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import {
  getLatencyAggregation,
  getLatencyValue,
} from '../../lib/helpers/latency_aggregation_type';
import { getDurationFieldForTransactions } from '../../lib/helpers/transactions';
import {
  calculateFailedTransactionRate,
  getOutcomeAggregation,
} from '../../lib/helpers/transaction_error_rate';
import { RollupInterval } from '../../../common/rollup';

interface ServiceTransactionGroupDetailedStat {
  transactionName: string;
  latency: Coordinate[];
  throughput: Coordinate[];
  errorRate: Coordinate[];
  impact: number;
}

async function getServiceTransactionGroupDetailedStatistics({
  environment,
  kuery,
  serviceName,
  transactionNames,
  apmEventClient,
  transactionType,
  latencyAggregationType,
  start,
  end,
  offset,
  documentType,
  rollupInterval,
  bucketSizeInSeconds,
  useDurationSummary,
}: {
  environment: string;
  kuery: string;
  serviceName: string;
  transactionNames: string[];
  apmEventClient: APMEventClient;
  transactionType: string;
  latencyAggregationType: LatencyAggregationType;
  start: number;
  end: number;
  offset?: string;
  documentType: ApmTransactionDocumentType;
  rollupInterval: RollupInterval;
  bucketSizeInSeconds: number;
  useDurationSummary: boolean;
}): Promise<ServiceTransactionGroupDetailedStat[]> {
  const { startWithOffset, endWithOffset } = getOffsetInMs({
    start,
    end,
    offset,
  });

  const intervalString = `${bucketSizeInSeconds}s`;

  const field = getDurationFieldForTransactions(
    documentType,
    useDurationSummary
  );

  const response = await apmEventClient.search(
    'get_service_transaction_group_detailed_statistics',
    {
      apm: {
        sources: [{ documentType, rollupInterval }],
      },
      body: {
        track_total_hits: false,
        size: 0,
        query: {
          bool: {
            filter: [
              { term: { [SERVICE_NAME]: serviceName } },
              { term: { [TRANSACTION_TYPE]: transactionType } },
              ...rangeQuery(startWithOffset, endWithOffset),
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
                    min: startWithOffset,
                    max: endWithOffset,
                  },
                },
                aggs: {
                  ...getLatencyAggregation(latencyAggregationType, field),
                  ...getOutcomeAggregation(documentType),
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
      y: timeseriesBucket.doc_count, // sparklines only shows trend (no axis)
    }));
    const errorRate = bucket.timeseries.buckets.map((timeseriesBucket) => ({
      x: timeseriesBucket.key,
      y: calculateFailedTransactionRate(timeseriesBucket),
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

export interface ServiceTransactionGroupDetailedStatisticsResponse {
  currentPeriod: Record<string, ServiceTransactionGroupDetailedStat>;
  previousPeriod: Record<string, ServiceTransactionGroupDetailedStat>;
}

export async function getServiceTransactionGroupDetailedStatisticsPeriods({
  serviceName,
  transactionNames,
  apmEventClient,
  transactionType,
  documentType,
  rollupInterval,
  bucketSizeInSeconds,
  useDurationSummary,
  latencyAggregationType,
  environment,
  kuery,
  start,
  end,
  offset,
}: {
  serviceName: string;
  transactionNames: string[];
  apmEventClient: APMEventClient;
  transactionType: string;
  documentType: ApmTransactionDocumentType;
  rollupInterval: RollupInterval;
  bucketSizeInSeconds: number;
  useDurationSummary: boolean;
  latencyAggregationType: LatencyAggregationType;
  environment: string;
  kuery: string;
  start: number;
  end: number;
  offset?: string;
}): Promise<ServiceTransactionGroupDetailedStatisticsResponse> {
  const commonProps = {
    apmEventClient,
    serviceName,
    transactionNames,
    transactionType,
    latencyAggregationType: latencyAggregationType as LatencyAggregationType,
    environment,
    kuery,
    documentType,
    rollupInterval,
    bucketSizeInSeconds,
    useDurationSummary,
  };

  const currentPeriodPromise = getServiceTransactionGroupDetailedStatistics({
    ...commonProps,
    start,
    end,
  });

  const previousPeriodPromise = offset
    ? getServiceTransactionGroupDetailedStatistics({
        ...commonProps,
        start,
        end,
        offset,
      })
    : [];

  const [currentPeriod, previousPeriod] = await Promise.all([
    currentPeriodPromise,
    previousPeriodPromise,
  ]);

  const firstCurrentPeriod = currentPeriod?.[0];

  return {
    currentPeriod: keyBy(currentPeriod, 'transactionName'),
    previousPeriod: keyBy(
      previousPeriod.map((data) => {
        return {
          ...data,
          errorRate: offsetPreviousPeriodCoordinates({
            currentPeriodTimeseries: firstCurrentPeriod?.errorRate,
            previousPeriodTimeseries: data.errorRate,
          }),
          throughput: offsetPreviousPeriodCoordinates({
            currentPeriodTimeseries: firstCurrentPeriod?.throughput,
            previousPeriodTimeseries: data.throughput,
          }),
          latency: offsetPreviousPeriodCoordinates({
            currentPeriodTimeseries: firstCurrentPeriod?.latency,
            previousPeriodTimeseries: data.latency,
          }),
        };
      }),
      'transactionName'
    ),
  };
}
