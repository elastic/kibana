/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { APIReturnType } from '@kbn/apm-api-shared';
import { useMemo } from 'react';
import { ApmDocumentType } from '../../../../../common/document_type';
import type { LatencyAggregationType } from '../../../../../common/latency_aggregation_types';
import { getLatencyChartSelector } from '../../../../selectors/latency_chart_selectors';
import { FETCH_STATUS, isPending, useFetcher } from '../../../../hooks/use_fetcher';
import { usePreferredDataSourceAndBucketSize } from '../../../../hooks/use_preferred_data_source_and_bucket_size';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { ChartType, getTimeSeriesColor } from '../../charts/helper/get_timeseries_color';
import type { TransactionDetailFlyoutFilters } from '../types';

const THROUGHPUT_INITIAL_STATE: APIReturnType<'GET /internal/apm/services/{serviceName}/throughput'> =
  {
    currentPeriod: [],
    previousPeriod: [],
  };

const ERROR_RATE_INITIAL_STATE: APIReturnType<'GET /internal/apm/services/{serviceName}/transactions/charts/error_rate'> =
  {
    currentPeriod: {
      timeseries: [],
      average: null,
    },
    previousPeriod: {
      timeseries: [],
      average: null,
    },
  };

export function useTransactionDetailFlyoutRedMetricsCharts({
  serviceName,
  transactionName,
  transactionType,
  environment,
  rangeFrom,
  rangeTo,
  latencyAggregationType,
}: TransactionDetailFlyoutFilters & {
  latencyAggregationType: LatencyAggregationType;
}) {
  const kuery = '';
  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const preferred = usePreferredDataSourceAndBucketSize({
    start,
    end,
    kuery,
    numBuckets: 100,
    type: ApmDocumentType.TransactionMetric,
  });

  const shouldUseDurationSummary =
    latencyAggregationType === 'avg' && preferred?.source?.hasDurationSummaryField;

  const {
    data: latencyData,
    status: latencyStatus,
    error: latencyError,
  } = useFetcher(
    (callApmApi) => {
      if (serviceName && transactionType && start && end && latencyAggregationType && preferred) {
        return callApmApi('GET /internal/apm/services/{serviceName}/transactions/charts/latency', {
          params: {
            path: { serviceName },
            query: {
              environment,
              kuery,
              start,
              end,
              transactionType,
              useDurationSummary: !!shouldUseDurationSummary,
              transactionName,
              latencyAggregationType,
              documentType: preferred.source.documentType,
              rollupInterval: preferred.source.rollupInterval,
              bucketSizeInSeconds: preferred.bucketSizeInSeconds,
            },
          },
        });
      }
    },
    [
      serviceName,
      transactionType,
      start,
      end,
      latencyAggregationType,
      preferred,
      environment,
      kuery,
      shouldUseDurationSummary,
      transactionName,
    ]
  );

  const latencyChartsData = useMemo(
    () =>
      getLatencyChartSelector({
        latencyChart: latencyData,
        latencyAggregationType,
        previousPeriodLabel: '',
      }),
    [latencyData, latencyAggregationType]
  );

  const {
    data: throughputData = THROUGHPUT_INITIAL_STATE,
    status: throughputStatus,
    error: throughputError,
  } = useFetcher(
    (callApmApi) => {
      if (serviceName && transactionType && start && end && preferred) {
        return callApmApi('GET /internal/apm/services/{serviceName}/throughput', {
          params: {
            path: { serviceName },
            query: {
              environment,
              kuery,
              start,
              end,
              transactionType,
              transactionName,
              documentType: preferred.source.documentType,
              rollupInterval: preferred.source.rollupInterval,
              bucketSizeInSeconds: preferred.bucketSizeInSeconds,
            },
          },
        });
      }
    },
    [environment, kuery, serviceName, start, end, transactionType, transactionName, preferred]
  );

  const {
    data: errorRateData = ERROR_RATE_INITIAL_STATE,
    status: errorRateStatus,
    error: errorRateError,
  } = useFetcher(
    (callApmApi) => {
      if (serviceName && transactionType && start && end && preferred) {
        return callApmApi(
          'GET /internal/apm/services/{serviceName}/transactions/charts/error_rate',
          {
            params: {
              path: { serviceName },
              query: {
                environment,
                kuery,
                start,
                end,
                transactionType,
                transactionName,
                documentType: preferred.source.documentType,
                rollupInterval: preferred.source.rollupInterval,
                bucketSizeInSeconds: preferred.bucketSizeInSeconds,
              },
            },
          }
        );
      }
    },
    [environment, kuery, serviceName, start, end, transactionType, transactionName, preferred]
  );

  const { currentPeriodColor: throughputColor } = getTimeSeriesColor(ChartType.THROUGHPUT);
  const { currentPeriodColor: errorRateColor } = getTimeSeriesColor(
    ChartType.FAILED_TRANSACTION_RATE
  );

  const latencyTimeseries = useMemo(
    () => (latencyChartsData.currentPeriod ? [latencyChartsData.currentPeriod] : []),
    [latencyChartsData.currentPeriod]
  );

  const throughputTimeseries = useMemo(
    () => [
      {
        data: throughputData.currentPeriod ?? [],
        type: 'linemark' as const,
        color: throughputColor,
        title: 'Throughput',
      },
    ],
    [throughputColor, throughputData.currentPeriod]
  );

  const errorRateTimeseries = useMemo(
    () => [
      {
        data: errorRateData.currentPeriod?.timeseries ?? [],
        type: 'linemark' as const,
        color: errorRateColor,
        title: 'Failed transaction rate (avg.)',
      },
    ],
    [errorRateColor, errorRateData.currentPeriod?.timeseries]
  );

  const isLoading =
    !preferred ||
    isPending(latencyStatus) ||
    isPending(throughputStatus) ||
    isPending(errorRateStatus);

  const hasError =
    latencyStatus === FETCH_STATUS.FAILURE ||
    throughputStatus === FETCH_STATUS.FAILURE ||
    errorRateStatus === FETCH_STATUS.FAILURE;

  return {
    latencyTimeseries,
    latencyStatus,
    latencyError,
    throughputTimeseries,
    throughputStatus,
    throughputError,
    errorRateTimeseries,
    errorRateStatus,
    errorRateError,
    isLoading,
    hasError,
  };
}
