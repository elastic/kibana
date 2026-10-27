/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useEuiTheme } from '@elastic/eui';
import { DEFAULT_PERCENTILE_THRESHOLD } from '../../../../../common/correlations/constants';
import { EVENT_OUTCOME } from '../../../../../common/es_fields/apm';
import { EventOutcome } from '../../../../../common/event_outcome';
import { LatencyDistributionChartType } from '../../../../../common/latency_distribution_chart_types';
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';
import { useRequestFlyoutFetcher } from '../use_request_flyout_fetcher';
import { getTransactionDistributionChartData } from '../../../app/correlations/get_transaction_distribution_chart_data';
import { useRequestFlyoutContext } from '../request_flyout_context';

/**
 * Latency distribution of the exit spans of the source service to the resources of the
 * connection, with the failed ones on top.
 */
export function useRequestFlyoutLatencyDistribution() {
  const { euiTheme } = useEuiTheme();
  const {
    connection: { sourceServiceName, dependencies },
    filters: { environment, start, end },
  } = useRequestFlyoutContext();

  // All-spans fetch: establishes the durationMin/durationMax for the second fetch.
  const { data: overallLatencyData = {}, status: overallLatencyStatus } = useRequestFlyoutFetcher(
    (callApmApi) =>
      callApmApi('POST /internal/apm/latency/overall_distribution/spans', {
        params: {
          body: {
            serviceName: sourceServiceName,
            environment,
            start,
            end,
            kuery: '',
            percentileThreshold: DEFAULT_PERCENTILE_THRESHOLD,
            chartType: LatencyDistributionChartType.dependencyLatency,
            spanDestinationServiceResources: dependencies,
          },
        },
      }),
    [sourceServiceName, dependencies, environment, start, end]
  );

  const overallLatencyHistogram = useMemo(
    () =>
      overallLatencyData.overallHistogram === undefined &&
      overallLatencyStatus !== FETCH_STATUS.LOADING
        ? []
        : overallLatencyData.overallHistogram,
    [overallLatencyData.overallHistogram, overallLatencyStatus]
  );

  const hasData = Array.isArray(overallLatencyHistogram) && overallLatencyHistogram.length > 0;

  // Failed-spans fetch: uses durationMin/durationMax of the first fetch, once it is done, to align
  // the bucket sizes.
  const { data: errorHistogramData = {}, status: errorHistogramStatus } = useRequestFlyoutFetcher(
    (callApmApi) => {
      if (
        overallLatencyStatus !== FETCH_STATUS.SUCCESS ||
        !overallLatencyData.durationMin ||
        !overallLatencyData.durationMax
      ) {
        return;
      }
      return callApmApi('POST /internal/apm/latency/overall_distribution/spans', {
        params: {
          body: {
            serviceName: sourceServiceName,
            environment,
            start,
            end,
            kuery: '',
            percentileThreshold: DEFAULT_PERCENTILE_THRESHOLD,
            chartType: LatencyDistributionChartType.dependencyLatency,
            spanDestinationServiceResources: dependencies,
            durationMin: overallLatencyData.durationMin,
            durationMax: overallLatencyData.durationMax,
            termFilters: [{ fieldName: EVENT_OUTCOME, fieldValue: EventOutcome.failure }],
          },
        },
      });
    },
    [
      sourceServiceName,
      dependencies,
      environment,
      start,
      end,
      overallLatencyStatus,
      overallLatencyData.durationMin,
      overallLatencyData.durationMax,
    ]
  );

  const chartData = useMemo(
    () =>
      getTransactionDistributionChartData({
        euiTheme,
        allTransactionsHistogram: overallLatencyHistogram,
        failedTransactionsHistogram: errorHistogramData.overallHistogram,
      }),
    [euiTheme, overallLatencyHistogram, errorHistogramData.overallHistogram]
  );

  return {
    totalDocCount: overallLatencyData.totalDocCount,
    chartData,
    hasData,
    percentileThresholdValue: overallLatencyData.percentileThresholdValue,
    // A failed overlay fetch surfaces too: without it the chart silently loses the failed calls.
    status:
      errorHistogramStatus === FETCH_STATUS.FAILURE ? errorHistogramStatus : overallLatencyStatus,
  };
}
