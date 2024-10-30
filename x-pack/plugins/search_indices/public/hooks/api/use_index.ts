/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Index } from '@kbn/index-management-shared-types';
import { useQuery } from '@tanstack/react-query';
import { QueryKeys } from '../../constants';
import { useKibana } from '../use_kibana';

const POLLING_INTERVAL = 15 * 1000;
export const useIndex = (indexName: string) => {
  const { http } = useKibana().services;
  const queryKey = [QueryKeys.FetchIndex, indexName];
  const result = useQuery<Index, { body: { statusCode: number; message: string; error: string } }>({
    queryKey,
    refetchInterval: POLLING_INTERVAL,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: 'always',
    retry: (failureCount, error) => {
      return !(error?.body?.statusCode === 404 || failureCount === 3);
    },
    queryFn: () =>
      http.fetch<Index>(`/internal/index_management/indices/${encodeURIComponent(indexName)}`),
  });
  return { queryKey, ...result };
};
