/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { EntityDefinitionWithState, GetEntityDefinitionParams } from '@kbn/entities-schema';
import { useKibana } from './use_kibana';
import { entityManagerKeys } from './query_key_factory';

export function useFetchEntityDefinition({ id }: GetEntityDefinitionParams) {
  const { http } = useKibana().services;

  const { isLoading, isError, isSuccess, data, refetch } = useQuery({
    queryKey: entityManagerKeys.definition(id),
    queryFn: async ({ signal }) => {
      try {
        const response = await http.get<EntityDefinitionWithState>(
          `/internal/entities/definition/${id}`,
          {
            signal,
          }
        );
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
