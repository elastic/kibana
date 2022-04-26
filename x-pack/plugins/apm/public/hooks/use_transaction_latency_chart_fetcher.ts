/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useFetcher } from './use_fetcher';
import { useLegacyUrlParams } from '../context/url_params_context/use_url_params';
import { useApmServiceContext } from '../context/apm_service/use_apm_service_context';
import { getLatencyChartSelector } from '../selectors/latency_chart_selectors';
import { useTimeRange } from './use_time_range';
import { useApmParams } from './use_apm_params';

export function useTransactionLatencyChartsFetcher({
  kuery,
  environment,
}: {
  kuery: string;
  environment: string;
}) {
  const { transactionType, serviceName } = useApmServiceContext();
  const {
    urlParams: { transactionName, latencyAggregationType },
  } = useLegacyUrlParams();

  const {
    query: { rangeFrom, rangeTo, offset, comparisonEnabled },
  } = useApmParams('/services/{serviceName}');

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const { data, error, status } = useFetcher(
    (callApmApi) => {
      if (
        serviceName &&
        start &&
        end &&
        transactionType &&
        latencyAggregationType
      ) {
        return callApmApi(
          'GET /internal/apm/services/{serviceName}/transactions/charts/latency',
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
                latencyAggregationType,
                offset: comparisonEnabled ? offset : undefined,
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
      transactionName,
      transactionType,
      latencyAggregationType,
      offset,
      comparisonEnabled,
    ]
  );

  const memoizedData = useMemo(
    () =>
      getLatencyChartSelector({
        latencyChart: data,
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
