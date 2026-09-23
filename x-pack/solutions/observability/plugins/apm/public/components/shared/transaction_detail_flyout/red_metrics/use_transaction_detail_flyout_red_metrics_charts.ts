/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { APIReturnType } from '@kbn/apm-api-shared';
import { i18n } from '@kbn/i18n';
import { useMemo } from 'react';
import { ApmDocumentType } from '../../../../../common/document_type';
import type { LatencyAggregationType } from '../../../../../common/latency_aggregation_types';
import { getLatencyChartSelector } from '../../../../selectors/latency_chart_selectors';
import { FETCH_STATUS, isPending, useFetcher } from '../../../../hooks/use_fetcher';
import { usePreferredDataSourceAndBucketSize } from '../../../../hooks/use_preferred_data_source_and_bucket_size';
import { ChartType, getTimeSeriesColor } from '../../charts/helper/get_timeseries_color';
import { useTransactionDetailFlyoutContext } from '../transaction_detail_flyout_context';
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
  start,
  end,
  latencyAggregationType,
}: TransactionDetailFlyoutFilters & {
  latencyAggregationType: LatencyAggregationType;
}) {
  const { refreshToken } = useTransactionDetailFlyoutContext();
  const kuery = '';

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
      // Absolute ranges keep the same start/end on refresh — include the token so we re-fetch.
      void refreshToken;
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
      refreshToken,
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
      void refreshToken;
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
    [
      environment,
      kuery,
      serviceName,
      start,
      end,
      transactionType,
      transactionName,
      preferred,
      refreshToken,
    ]
  );

  const {
    data: errorRateData = ERROR_RATE_INITIAL_STATE,
    status: errorRateStatus,
    error: errorRateError,
  } = useFetcher(
    (callApmApi) => {
      void refreshToken;
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
    [
      environment,
      kuery,
      serviceName,
      start,
      end,
      transactionType,
      transactionName,
      preferred,
      refreshToken,
    ]
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
        title: i18n.translate('xpack.apm.transactionDetailFlyout.throughputSeriesTitle', {
          defaultMessage: 'Throughput',
        }),
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
        title: i18n.translate('xpack.apm.transactionDetailFlyout.errorRateSeriesTitle', {
          defaultMessage: 'Failed transaction rate (avg.)',
        }),
      },
    ],
    [errorRateColor, errorRateData.currentPeriod?.timeseries]
  );

  // Full-section skeleton only on the first load. Latency aggregation changes
  // re-fetch latency alone — keep throughput / failed rate mounted and let
  // TimeseriesChart handle per-chart pending via fetchStatus.
  const isInitialLoading =
    !preferred ||
    (isPending(latencyStatus) && isPending(throughputStatus) && isPending(errorRateStatus));

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
    isLoading: isInitialLoading,
    hasError,
  };
}
