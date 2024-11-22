/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { useKibana } from './use_kibana';
import { APIRoutes, IndicesQuerySourceFields } from '../types';

const initialData = {};

export const useIndicesFields = (indices: string[] = []) => {
  const { services } = useKibana();

  const { data, isLoading, isFetching } = useQuery<IndicesQuerySourceFields>({
    enabled: indices.length > 0,
    queryKey: ['fields', indices.toString()],
    initialData,
    queryFn: async () => {
      const response = await services.http.post<IndicesQuerySourceFields>(
        APIRoutes.POST_QUERY_SOURCE_FIELDS,
        {
          body: JSON.stringify({
            indices,
          }),
        }
      );

      return response;
    },
  });

  return { fields: data, isLoading: isLoading || isFetching };
};
