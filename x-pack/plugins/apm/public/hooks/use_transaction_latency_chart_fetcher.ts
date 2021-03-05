/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useFetcher } from './use_fetcher';
import { useUrlParams } from '../context/url_params_context/use_url_params';
import { useApmServiceContext } from '../context/apm_service/use_apm_service_context';
import { getLatencyChartSelector } from '../selectors/latency_chart_selectors';
import { useTheme } from './use_theme';
import { useServiceName } from './use_service_name';

export function useTransactionLatencyChartsFetcher() {
  const serviceName = useServiceName();
  const { transactionType } = useApmServiceContext();
  const theme = useTheme();
  const {
    urlParams: {
      environment,
      kuery,
      start,
      end,
      transactionName,
      latencyAggregationType,
    },
  } = useUrlParams();

  const { data, error, status } = useFetcher(
    (callApmApi) => {
      if (
        serviceName &&
        start &&
        end &&
        transactionType &&
        latencyAggregationType
      ) {
        return callApmApi({
          endpoint:
            'GET /api/apm/services/{serviceName}/transactions/charts/latency',
          params: {
            path: { serviceName },
            query: {
              environment,
              kuery,
              start,
              end,
              transactionType,
              transactionName,
              latencyAggregationType,
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
      transactionName,
      transactionType,
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
