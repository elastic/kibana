/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  QueryObserverResult,
  RefetchOptions,
  RefetchQueryFilters,
  useQuery,
} from '@tanstack/react-query';
import { SLOResponse } from '@kbn/slo-schema';
import { useKibana } from '../../utils/kibana_react';

export interface UseFetchSloDefinitionsResponse {
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  data: SLOResponse[] | undefined;
  refetch: <TPageData>(
    options?: (RefetchOptions & RefetchQueryFilters<TPageData>) | undefined
  ) => Promise<QueryObserverResult<SLOResponse[], unknown>>;
}

interface Params {
  name?: string;
  size?: number;
}

export function useFetchSloDefinitions({
  name = '',
  size = 10,
}: Params): UseFetchSloDefinitionsResponse {
  const { savedObjects } = useKibana().services;
  const search = name.endsWith('*') ? name : `${name}*`;

  const { isLoading, isError, isSuccess, data, refetch } = useQuery({
    queryKey: ['fetchSloDefinitions', search],
    queryFn: async () => {
      try {
        const response = await savedObjects.client.find<SLOResponse>({
          type: 'slo',
          search,
          searchFields: ['name'],
          perPage: size,
        });
        return response.savedObjects.map((so) => so.attributes);
      } catch (error) {
        throw new Error(`Something went wrong. Error: ${error}`);
      }
    },
  });

  return { isLoading, isError, isSuccess, data, refetch };
}
