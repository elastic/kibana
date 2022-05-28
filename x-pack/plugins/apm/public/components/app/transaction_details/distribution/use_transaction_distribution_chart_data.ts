/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { DEFAULT_PERCENTILE_THRESHOLD } from '../../../../../common/correlations/constants';
import { EVENT_OUTCOME } from '../../../../../common/elasticsearch_fieldnames';
import { EventOutcome } from '../../../../../common/event_outcome';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { useFetcher, FETCH_STATUS } from '../../../../hooks/use_fetcher';
import { isErrorMessage } from '../../correlations/utils/is_error_message';
import { useFetchParams } from '../../correlations/use_fetch_params';
import { getTransactionDistributionChartData } from '../../correlations/get_transaction_distribution_chart_data';
import { useTheme } from '../../../../hooks/use_theme';

export const useTransactionDistributionChartData = () => {
  const params = useFetchParams();
  const euiTheme = useTheme();

  const {
    core: { notifications },
  } = useApmPluginContext();

  const {
    data: overallLatencyData = {},
    status: overallLatencyStatus,
    error: overallLatencyError,
  } = useFetcher(
    (callApmApi) => {
      if (
        params.serviceName &&
        params.environment &&
        params.start &&
        params.end
      ) {
        return callApmApi('POST /internal/apm/latency/overall_distribution', {
          params: {
            body: {
              ...params,
              percentileThreshold: DEFAULT_PERCENTILE_THRESHOLD,
            },
          },
        });
      }
    },
    [params]
  );

  useEffect(() => {
    if (isErrorMessage(overallLatencyError)) {
      notifications.toasts.addDanger({
        title: i18n.translate(
          'xpack.apm.transactionDetails.distribution.latencyDistributionErrorTitle',
          {
            defaultMessage:
              'An error occurred fetching the overall latency distribution.',
          }
        ),
        text: overallLatencyError.toString(),
      });
    }
  }, [overallLatencyError, notifications.toasts]);

  const overallLatencyHistogram =
    overallLatencyData.overallHistogram === undefined &&
    overallLatencyStatus !== FETCH_STATUS.LOADING
      ? []
      : overallLatencyData.overallHistogram;
  const hasData =
    Array.isArray(overallLatencyHistogram) &&
    overallLatencyHistogram.length > 0;

  const { data: errorHistogramData = {}, error: errorHistogramError } =
    useFetcher(
      (callApmApi) => {
        if (
          params.serviceName &&
          params.environment &&
          params.start &&
          params.end
        ) {
          return callApmApi('POST /internal/apm/latency/overall_distribution', {
            params: {
              body: {
                ...params,
                percentileThreshold: DEFAULT_PERCENTILE_THRESHOLD,
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
      [params]
    );

  useEffect(() => {
    if (isErrorMessage(errorHistogramError)) {
      notifications.toasts.addDanger({
        title: i18n.translate(
          'xpack.apm.transactionDetails.distribution.failedTransactionsLatencyDistributionErrorTitle',
          {
            defaultMessage:
              'An error occurred fetching the failed transactions latency distribution.',
          }
        ),
        text: errorHistogramError.toString(),
      });
    }
  }, [errorHistogramError, notifications.toasts]);

  const transactionDistributionChartData = getTransactionDistributionChartData({
    euiTheme,
    allTransactionsHistogram: overallLatencyHistogram,
    failedTransactionsHistogram: errorHistogramData.overallHistogram,
  });

  return {
    chartData: transactionDistributionChartData,
    hasData,
    percentileThresholdValue: overallLatencyData.percentileThresholdValue,
    status: overallLatencyStatus,
  };
};
