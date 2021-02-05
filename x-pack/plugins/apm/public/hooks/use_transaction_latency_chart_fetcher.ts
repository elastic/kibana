/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useFetcher } from './use_fetcher';
import { useUrlParams } from '../context/url_params_context/use_url_params';
import { useApmServiceContext } from '../context/apm_service/use_apm_service_context';
import { getLatencyChartSelector } from '../selectors/latency_chart_selectors';
import { useTheme } from './use_theme';
import { LatencyAggregationType } from '../../common/latency_aggregation_types';
import { useTimeRangeComparison } from '../components/shared/time_comparison/use_time_range_comparison';

export function useTransactionLatencyChartsFetcher() {
  const { serviceName } = useParams<{ serviceName?: string }>();
  const { transactionType } = useApmServiceContext();
  const theme = useTheme();
  const {
    urlParams: {
      start,
      end,
      transactionName,
      latencyAggregationType,
      comparisonType,
    },
    uiFilters,
  } = useUrlParams();

  const { comparisonStart, comparisonEnd } = useTimeRangeComparison({
    start,
    end,
    comparisonType,
  });

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
              start,
              end,
              transactionType,
              transactionName,
              uiFilters: JSON.stringify(uiFilters),
              latencyAggregationType: latencyAggregationType as LatencyAggregationType,
              comparisonStart,
              comparisonEnd,
            },
          },
        });
      }
    },
    [
      serviceName,
      start,
      end,
      transactionName,
      transactionType,
      uiFilters,
      latencyAggregationType,
      comparisonStart,
      comparisonEnd,
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
