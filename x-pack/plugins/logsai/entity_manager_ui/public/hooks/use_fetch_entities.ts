/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { FindEntitiesResponse } from '@kbn/entities-schema';
import { useKibana } from './use_kibana';
import { entityManagerKeys } from './query_key_factory';

export function useFetchEntities({
  perPage,
  query,
  searchAfter,
  sortField,
  sortDirection,
}: {
  perPage: number;
  query: string;
  searchAfter?: string;
  sortField: string;
  sortDirection: 'asc' | 'desc';
}) {
  const { http } = useKibana().services;

  const { isLoading, isError, isSuccess, data, refetch } = useQuery({
    queryKey: entityManagerKeys.entities(query, sortField, sortDirection, searchAfter, perPage),
    queryFn: async ({ signal }) => {
      try {
        const response = await http.get<FindEntitiesResponse>(`/internal/entities/_find`, {
          signal,
          query: {
            query,
            sortField,
            sortDirection,
            perPage,
            searchAfter,
          },
        });
        return response;
      } catch (e) {
        throw new Error(`Something went wrong: ${e}`);
      }
    },
    retry: false,
    refetchOnWindowFocus: false,
  });

  return { isLoading, isError, isSuccess, data, refetch };
}
