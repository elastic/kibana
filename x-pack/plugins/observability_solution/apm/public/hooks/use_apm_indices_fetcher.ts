/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ApmIndicesConfig } from '@kbn/observability-shared-plugin/public';
import { FetcherResult, useFetcher } from './use_fetcher';

export function useApmIndicesFetcher(): FetcherResult<ApmIndicesConfig> {
  return useFetcher((callApmApi) => {
    return callApmApi('GET /internal/apm/settings/apm-indices');
  }, []);
}
