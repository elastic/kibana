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
  query: string = ''
): { indices: IndexName[]; isLoading: boolean } => {
  const { services } = useKibana();

  const { data, isLoading } = useQuery({
    queryKey: ['indices', query],
    queryFn: async () => {
      const response = await services.http.get<{
        indices: string[];
      }>(APIRoutes.GET_INDICES, {
        query: {
          search_query: query,
          size: 10,
        },
      });

      return response.indices;
    },
    initialData: [],
  });

  return { indices: data, isLoading };
};
