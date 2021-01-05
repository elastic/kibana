/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useApmServiceContext } from '../context/apm_service/use_apm_service_context';
import { useUrlParams } from '../context/url_params_context/use_url_params';
import { getLatencyChartSelector } from '../selectors/latency_chart_selectors';
import { useEnvironmentsFetcher } from './use_environments_fetcher';
import { useFetcher } from './use_fetcher';
import { useLatencyAggregationType } from './use_latency_Aggregation_type';
import { useTheme } from './use_theme';

export function useTransactionLatencyChartFetcher() {
  const { serviceName } = useParams<{ serviceName?: string }>();
  const { transactionType } = useApmServiceContext();
  const latencyAggregationType = useLatencyAggregationType();
  const theme = useTheme();
  const {
    urlParams: { start, end, transactionName },
    uiFilters,
  } = useUrlParams();
  const { environments } = useEnvironmentsFetcher({ start, end, serviceName });

  const { data, error, status } = useFetcher(
    (callApmApi) => {
      // If we have "All" selected in the environment selector, there won't be
      // any ML jobs for the "All" environment. If we have a single environment
      // (fetched with the `useEnvironmentsFetcher`) we can safely assume the
      // user would want to see ML data for that single environment.
      //
      // We modify the uiFilters here, which is not advised, but the uiFilters
      // are what's used to specify the environment when using this endpoint.
      const environmentCount = environments.length;
      const modifiedUiFilters =
        environmentCount === 1
          ? { ...uiFilters, environment: environments[0] }
          : uiFilters;

      if (
        serviceName &&
        start &&
        end &&
        transactionType &&
        latencyAggregationType &&
        environmentCount > 0
      ) {
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
              uiFilters: JSON.stringify(modifiedUiFilters),
              latencyAggregationType,
            },
          },
        });
      }
    },
    [
      environments,
      serviceName,
      start,
      end,
      transactionName,
      transactionType,
      uiFilters,
      latencyAggregationType,
    ]
  );

  const memoizedData = useMemo(
    () =>
      getLatencyChartSelector({
        latencyChart: data,
        theme,
        latencyAggregationType,
      }),
    // It should only update when the data has changed
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data]
  );

  return {
    latencyChartsData: memoizedData,
    latencyChartsStatus: status,
    latencyChartsError: error,
  };
}
