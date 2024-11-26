/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { IndexName } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { useKibana } from './use_kibana';
import { APIRoutes } from '../types';

export const useQueryIndices = (
  {
    query,
    exact,
  }: {
    query?: string;
    exact?: boolean;
  } = { query: '', exact: false }
): { indices: IndexName[]; isLoading: boolean; isFetched: boolean } => {
  const { services } = useKibana();

  const { data, isLoading, isFetched } = useQuery({
    queryKey: ['indices', query],
    queryFn: async () => {
      try {
        const response = await services.http.get<{
          indices: string[];
        }>(APIRoutes.GET_INDICES, {
          query: {
            search_query: query,
            exact,
            size: 50,
          },
        });

        return response.indices;
      } catch (err) {
        if (err?.response?.status === 404) {
          return [];
        }

        throw err;
      }
    },
    initialData: [],
  });

  return { indices: data, isLoading, isFetched };
};
