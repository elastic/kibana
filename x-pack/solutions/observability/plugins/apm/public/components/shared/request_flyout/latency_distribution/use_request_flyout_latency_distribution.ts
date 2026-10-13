/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo } from 'react';
import { useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DEFAULT_PERCENTILE_THRESHOLD } from '../../../../../common/correlations/constants';
import { EVENT_OUTCOME } from '../../../../../common/es_fields/apm';
import { EventOutcome } from '../../../../../common/event_outcome';
import { LatencyDistributionChartType } from '../../../../../common/latency_distribution_chart_types';
import { FETCH_STATUS, useFetcher } from '../../../../hooks/use_fetcher';
import { getTransactionDistributionChartData } from '../../../app/correlations/get_transaction_distribution_chart_data';
import { isErrorMessage } from '../../../app/correlations/utils/is_error_message';
import { useRequestFlyoutContext } from '../request_flyout_context';

export function useRequestFlyoutLatencyDistribution() {
  const { euiTheme } = useEuiTheme();
  const {
    connection: { dependencies },
    filters: { environment, start, end },
    deps: {
      core: { notifications },
    },
    refreshToken,
  } = useRequestFlyoutContext();

  // All-spans fetch: establishes the durationMin/durationMax for the second fetch.
  const {
    data: overallLatencyData = {},
    status: overallLatencyStatus,
    error: overallLatencyError,
  } = useFetcher(
    (callApmApi) => {
      void refreshToken;
      if (dependencies.length > 0 && environment && start && end) {
        return callApmApi('POST /internal/apm/latency/overall_distribution/spans', {
          params: {
            body: {
              environment,
              start,
              end,
              kuery: '',
              percentileThreshold: DEFAULT_PERCENTILE_THRESHOLD,
              chartType: LatencyDistributionChartType.dependencyLatency,
              spanDestinationServiceResources: dependencies,
            },
          },
        });
      }
    },
    [dependencies, environment, start, end, refreshToken]
  );

  useEffect(() => {
    if (isErrorMessage(overallLatencyError)) {
      notifications.toasts.addDanger({
        title: i18n.translate(
          'xpack.apm.requestFlyout.distribution.latencyDistributionErrorTitle',
          {
            defaultMessage: 'An error occurred fetching the overall latency distribution.',
          }
        ),
        text: overallLatencyError.toString(),
      });
    }
  }, [overallLatencyError, notifications.toasts]);

  const overallLatencyHistogram = useMemo(
    () =>
      overallLatencyData.overallHistogram === undefined &&
      overallLatencyStatus !== FETCH_STATUS.LOADING
        ? []
        : overallLatencyData.overallHistogram,
    [overallLatencyData.overallHistogram, overallLatencyStatus]
  );

  const hasData = Array.isArray(overallLatencyHistogram) && overallLatencyHistogram.length > 0;

  // Failed-spans fetch: uses durationMin/durationMax from the first fetch to align bucket sizes.
  const { data: errorHistogramData = {}, error: errorHistogramError } = useFetcher(
    (callApmApi) => {
      void refreshToken;
      if (
        dependencies.length > 0 &&
        environment &&
        start &&
        end &&
        overallLatencyData.durationMin &&
        overallLatencyData.durationMax
      ) {
        return callApmApi('POST /internal/apm/latency/overall_distribution/spans', {
          params: {
            body: {
              environment,
              start,
              end,
              kuery: '',
              percentileThreshold: DEFAULT_PERCENTILE_THRESHOLD,
              chartType: LatencyDistributionChartType.dependencyLatency,
              spanDestinationServiceResources: dependencies,
              durationMin: overallLatencyData.durationMin,
              durationMax: overallLatencyData.durationMax,
              termFilters: [
                {
                  fieldName: EVENT_OUTCOME,
                  fieldValue: EventOutcome.failure,
                },
              ],
            },
          },
        });
      }
    },
    [
      dependencies,
      environment,
      start,
      end,
      overallLatencyData.durationMin,
      overallLatencyData.durationMax,
      refreshToken,
    ]
  );

  useEffect(() => {
    if (isErrorMessage(errorHistogramError)) {
      notifications.toasts.addDanger({
        title: i18n.translate(
          'xpack.apm.requestFlyout.distribution.failedSpansLatencyDistributionErrorTitle',
          {
            defaultMessage: 'An error occurred fetching the failed spans latency distribution.',
          }
        ),
        text: errorHistogramError.toString(),
      });
    }
  }, [errorHistogramError, notifications.toasts]);

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
    status: overallLatencyStatus,
  };
}
