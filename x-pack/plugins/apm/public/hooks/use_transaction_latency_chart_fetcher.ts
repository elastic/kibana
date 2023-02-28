/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { isTimeComparison } from '../components/shared/time_comparison/get_comparison_options';
import { useApmServiceContext } from '../context/apm_service/use_apm_service_context';
import { useLegacyUrlParams } from '../context/url_params_context/use_url_params';
import { getLatencyChartSelector } from '../selectors/latency_chart_selectors';
import { useAnyOfApmParams } from './use_apm_params';
import { FETCH_STATUS, useFetcher } from './use_fetcher';
import { usePreviousPeriodLabel } from './use_previous_period_text';
import { useTimeRange } from './use_time_range';

export function useTransactionLatencyChartsFetcher({
  kuery,
  environment,
}: {
  kuery: string;
  environment: string;
}) {
  const { transactionType, serviceName, transactionTypeStatus } =
    useApmServiceContext();
  const {
    urlParams: { transactionName, latencyAggregationType },
  } = useLegacyUrlParams();

  const {
    query: { rangeFrom, rangeTo, offset, comparisonEnabled },
  } = useAnyOfApmParams(
    '/services/{serviceName}',
    '/mobile-services/{serviceName}'
  );

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const { data, error, status } = useFetcher(
    (callApmApi) => {
      if (!transactionType && transactionTypeStatus === FETCH_STATUS.SUCCESS) {
        return Promise.resolve(undefined);
      }

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
                offset:
                  comparisonEnabled && isTimeComparison(offset)
                    ? offset
                    : undefined,
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
      transactionTypeStatus,
      latencyAggregationType,
      offset,
      comparisonEnabled,
    ]
  );

  const previousPeriodLabel = usePreviousPeriodLabel();
  const memoizedData = useMemo(
    () =>
      getLatencyChartSelector({
        latencyChart: data,
        latencyAggregationType,
        previousPeriodLabel,
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
