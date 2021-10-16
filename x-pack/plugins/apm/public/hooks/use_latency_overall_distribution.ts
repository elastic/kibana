/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_PERCENTILE_THRESHOLD } from '../../common/search_strategies/constants';

import { useApmServiceContext } from '../context/apm_service/use_apm_service_context';
import { useUrlParams } from '../context/url_params_context/use_url_params';

import { useApmParams } from './use_apm_params';
import { useFetcher, FETCH_STATUS } from './use_fetcher';
import { useTimeRange } from './use_time_range';

export function useLatencyOverallDistribution() {
  const { serviceName, transactionType } = useApmServiceContext();

  const { urlParams } = useUrlParams();
  const { transactionName } = urlParams;

  const {
    query: { kuery, environment, rangeFrom, rangeTo },
  } = useApmParams('/services/{serviceName}/transactions/view');

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const {
    data = { log: [] },
    status,
    error,
  } = useFetcher(
    (callApmApi) => {
      if (serviceName && environment && start && end) {
        return callApmApi({
          endpoint: 'POST /internal/apm/latency/overall_distribution',
          params: {
            body: {
              serviceName,
              transactionName,
              transactionType,
              kuery,
              environment,
              start,
              end,
              percentileThreshold: DEFAULT_PERCENTILE_THRESHOLD,
            },
          },
        });
      }
    },
    [
      serviceName,
      transactionName,
      transactionType,
      kuery,
      environment,
      start,
      end,
    ]
  );

  const { percentileThresholdValue } = data;
  const overallHistogram =
    data.overallHistogram === undefined && status !== FETCH_STATUS.LOADING
      ? []
      : data.overallHistogram;
  const hasData =
    Array.isArray(overallHistogram) && overallHistogram.length > 0;

  return { error, hasData, overallHistogram, percentileThresholdValue, status };
}
