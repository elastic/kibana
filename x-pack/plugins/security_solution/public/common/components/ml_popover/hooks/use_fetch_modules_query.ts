/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryOptions } from '@tanstack/react-query';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { getModules } from '../api';
import type { GetModulesProps, Module } from '../types';

const ONE_MINUTE = 60000;
export const GET_MODULES_QUERY_KEY = ['GET', '/internal/ml/modules/get_module/:moduleId'];

export const useFetchModulesQuery = (
  queryArgs: Omit<GetModulesProps, 'signal'>,
  options?: UseQueryOptions<Module[]>
) => {
  return useQuery<Module[]>(
    [GET_MODULES_QUERY_KEY, queryArgs],
    async ({ signal }) => getModules({ signal, ...queryArgs }),
    {
      refetchIntervalInBackground: false,
      staleTime: ONE_MINUTE * 5,
      retry: false,
      ...options,
    }
  );
};

export const useInvalidateFetchModulesQuery = () => {
  const queryClient = useQueryClient();

  return useCallback(() => {
    queryClient.invalidateQueries(GET_MODULES_QUERY_KEY, { refetchType: 'active' });
  }, [queryClient]);
};
