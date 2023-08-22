/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { useKibana } from '../../utils/kibana_react';

export interface UseFetchIndexPatternFieldsResponse {
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  data: Field[] | undefined;
}

export interface Field {
  name: string;
  type: string;
  aggregatable: boolean;
  searchable: boolean;
}

export function useFetchIndexPatternFields(
  indexPattern?: string
): UseFetchIndexPatternFieldsResponse {
  const { dataViews } = useKibana().services;

  const { isLoading, isError, isSuccess, data } = useQuery({
    queryKey: ['fetchIndexPatternFields', indexPattern],
    queryFn: async ({ signal }) => {
      if (!indexPattern) {
        return [];
      }
      try {
        return await dataViews.getFieldsForWildcard({ pattern: indexPattern });
      } catch (error) {
        throw new Error(`Something went wrong. Error: ${error}`);
      }
    },
    retry: false,
    refetchOnWindowFocus: false,
    enabled: Boolean(indexPattern),
  });

  return { isLoading, isError, isSuccess, data };
}
