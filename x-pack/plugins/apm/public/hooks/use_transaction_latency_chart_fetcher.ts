/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useFetcher } from './use_fetcher';
import { useUrlParams } from '../context/url_params_context/use_url_params';
import { getLatencyChartSelector } from '../selectors/latency_chart_selectors';
import { useTheme } from './use_theme';

export function useTransactionLatencyChartsFetcher() {
  const { serviceName } = useParams<{ serviceName?: string }>();
  const theme = useTheme();
  const {
    urlParams: { transactionType, start, end, transactionName },
    uiFilters,
  } = useUrlParams();

  const { data, error, status } = useFetcher(
    (callApmApi) => {
      if (serviceName && start && end) {
        return callApmApi({
          endpoint:
            'GET /api/apm/services/{serviceName}/transactions/charts/latency',
          params: {
            path: { serviceName },
            query: {
              start,
              end,
              transactionType,
              transactionName,
              uiFilters: JSON.stringify(uiFilters),
            },
          },
        });
      }
    },
    [serviceName, start, end, transactionName, transactionType, uiFilters]
  );

  const memoizedData = useMemo(
    () => getLatencyChartSelector({ latencyChart: data, theme }),
    [data, theme]
  );

  return {
    latencyChartsData: memoizedData,
    latencyChartsStatus: status,
    latencyChartsError: error,
  };
}
