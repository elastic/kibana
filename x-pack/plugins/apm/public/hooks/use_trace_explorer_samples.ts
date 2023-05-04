/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { createSharedUseFetcher } from './create_shared_use_fetcher';

const sharedUseFetcher = createSharedUseFetcher(
  'GET /internal/apm/traces/find'
);

const useTraceExplorerSamples = () => {
  const result = sharedUseFetcher.useFetcherResult();

  return useMemo(() => {
    return {
      ...result,
      data: result.data || {
        traceSamples: [],
      },
    };
  }, [result]);
};
const TraceExplorerSamplesFetcherContextProvider = sharedUseFetcher.Provider;

export { useTraceExplorerSamples, TraceExplorerSamplesFetcherContextProvider };
