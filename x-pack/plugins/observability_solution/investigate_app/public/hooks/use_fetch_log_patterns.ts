/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { GetLogPatternsResponse } from '@kbn/investigation-shared';
import { useKibana } from './use_kibana';
import { investigationKeys } from './query_key_factory';

export interface LogPatternAnalysisParams {
  investigationId: string;
  sources: Array<{
    index: string;
    filter?: string;
  }>;
  start: string;
  end: string;
}

export function useFetchLogPatterns({
  investigationId,
  sources,
  start,
  end,
}: LogPatternAnalysisParams) {
  const {
    core: { http },
  } = useKibana();

  const { isInitialLoading, isLoading, isError, isSuccess, isRefetching, data } = useQuery({
    queryKey: investigationKeys.logPatterns({
      investigationId,
      sources: JSON.stringify(sources),
      start,
      end,
    }),
    queryFn: async ({ signal }) => {
      return await http.post<GetLogPatternsResponse>(
        '/internal/observability/investigation/log_patterns',
        {
          body: JSON.stringify({
            sources,
            start,
            end,
          }),
          version: '2023-10-31',
          signal,
        }
      );
    },
    refetchOnWindowFocus: false,
    onError: (error: Error) => {
      // ignore error
    },
    enabled: Boolean(investigationId && sources.length && start && end),
  });

  return {
    data,
    isInitialLoading,
    isLoading,
    isRefetching,
    isSuccess,
    isError,
  };
}
