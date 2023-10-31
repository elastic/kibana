/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryOptions } from '@tanstack/react-query';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { checkRecognizer } from '../api';
import type { CheckRecognizerProps, RecognizerModule } from '../types';

const ONE_MINUTE = 60000;
export const GET_RECOGNIZER_QUERY_KEY = ['GET', '/internal/ml/modules/recognize/:indexPatterns'];

export const useFetchRecognizerQuery = (
  queryArgs: Omit<CheckRecognizerProps, 'signal'>,
  options?: UseQueryOptions<RecognizerModule[]>
) => {
  return useQuery<RecognizerModule[]>(
    [GET_RECOGNIZER_QUERY_KEY, queryArgs],
    async ({ signal }) => checkRecognizer({ signal, ...queryArgs }),
    {
      refetchIntervalInBackground: false,
      staleTime: ONE_MINUTE * 5,
      retry: false,
      ...options,
    }
  );
};

export const useInvalidateFetchRecognizerQuery = () => {
  const queryClient = useQueryClient();

  return useCallback(() => {
    queryClient.invalidateQueries(GET_RECOGNIZER_QUERY_KEY, { refetchType: 'active' });
  }, [queryClient]);
};
