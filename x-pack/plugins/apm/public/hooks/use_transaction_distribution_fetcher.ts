/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import type { LatencyCorrelationsAsyncSearchServiceRawResponse } from '../../common/search_strategies/latency_correlations/types';
import { APM_SEARCH_STRATEGIES } from '../../common/search_strategies/constants';

import { useSearchStrategy } from './use_search_strategy';

export function useTransactionDistributionFetcher() {
  const [
    response,
    setResponse,
  ] = useState<LatencyCorrelationsAsyncSearchServiceRawResponse>({
    ccsWarning: false,
    log: [],
    took: 0,
  });

  const {
    fetchState,
    rawResponse,
    ...searchStrategy
  } = useSearchStrategy<LatencyCorrelationsAsyncSearchServiceRawResponse>(
    APM_SEARCH_STRATEGIES.APM_LATENCY_CORRELATIONS
  );

  useEffect(() => {
    setResponse((prevState) => ({
      ...prevState,
      ccsWarning: rawResponse?.ccsWarning ?? false,
      values: rawResponse?.values ?? [],
      log: rawResponse?.log ?? [],
      // only set percentileThresholdValue and overallHistogram once it's repopulated on a refresh,
      // otherwise the consuming chart would flicker with an empty state on reload.
      ...(rawResponse?.percentileThresholdValue !== undefined &&
      rawResponse?.overallHistogram !== undefined
        ? {
            overallHistogram: rawResponse?.overallHistogram,
            percentileThresholdValue: rawResponse?.percentileThresholdValue,
          }
        : {}),
      // if loading is done but didn't return any data for the overall histogram,
      // set it to an empty array so the consuming chart component knows loading is done.
      ...(!fetchState.isRunning && rawResponse?.overallHistogram === undefined
        ? { overallHistogram: [] }
        : {}),
    }));
  }, [fetchState.isRunning, rawResponse]);

  return {
    ...fetchState,
    ...searchStrategy,
    ...response,
  };
}
