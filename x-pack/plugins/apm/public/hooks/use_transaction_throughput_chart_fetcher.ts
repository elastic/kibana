/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useFetcher } from './use_fetcher';
import { useUrlParams } from '../context/url_params_context/use_url_params';
import { getThroughputChartSelector } from '../selectors/throughput_chart_selectors';
import { useTheme } from './use_theme';
import { useApmServiceContext } from '../context/apm_service/use_apm_service_context';

export function useTransactionThroughputChartsFetcher() {
  const { transactionType, serviceName } = useApmServiceContext();
  const theme = useTheme();
  const {
    urlParams: { environment, kuery, start, end, transactionName },
  } = useUrlParams();

  const { data, error, status } = useFetcher(
    (callApmApi) => {
      if (transactionType && serviceName && start && end) {
        return callApmApi({
          endpoint:
            'GET /api/apm/services/{serviceName}/transactions/charts/throughput',
          params: {
            path: { serviceName },
            query: {
              environment,
              kuery,
              start,
              end,
              transactionType,
              transactionName,
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
    ]
  );

  const memoizedData = useMemo(
    () => getThroughputChartSelector({ throughputChart: data, theme }),
    [data, theme]
  );

  return {
    throughputChartsData: memoizedData,
    throughputChartsStatus: status,
    throughputChartsError: error,
  };
}
