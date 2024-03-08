/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { useKibana } from './use_kibana';
import { IndicesQuerySourceFields } from '../types';

export const useIndicesFields = (indices: string[]) => {
  const { services } = useKibana();

  const { data, isLoading } = useQuery({
    enabled: indices.length > 0,
    queryKey: ['fields', indices.toString()],
    initialData: {},
    queryFn: async () => {
      const response = await services.http.post<IndicesQuerySourceFields>(
        '/internal/enterprise_search/ai_playground/query_source_fields',
        {
          body: JSON.stringify({
            indices,
          }),
        }
      );

      return response;
    },
  });

  return { fields: data!, isLoading };
};
