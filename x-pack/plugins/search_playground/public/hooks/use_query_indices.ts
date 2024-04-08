/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { IndexName } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { useKibana } from './use_kibana';
import { ElasticsearchIndex } from '../types';

export const useQueryIndices = (
  query: string = ''
): { indices: IndexName[]; isLoading: boolean } => {
  const { services } = useKibana();

  const { data, isLoading } = useQuery({
    queryKey: ['indices', query],
    queryFn: async () => {
      const response = await services.http.get<{
        indices: ElasticsearchIndex[];
      }>('/internal/enterprise_search/indices', {
        query: {
          from: 0,
          only_show_search_optimized_indices: false,
          return_hidden_indices: false,
          search_query: query,
          size: 20,
        },
      });

      return response.indices.map((index) => index.name);
    },
  });

  return { indices: data || [], isLoading };
};
