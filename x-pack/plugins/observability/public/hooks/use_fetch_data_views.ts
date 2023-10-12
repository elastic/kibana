/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { DataView } from '@kbn/data-views-plugin/public';
import { useKibana } from '../utils/kibana_react';

export interface UseFetchDataViewsResponse {
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  data: DataView[] | undefined;
}

interface Params {
  name?: string;
  size?: number;
}

export function useFetchDataViews({ name = '', size = 5 }: Params): UseFetchDataViewsResponse {
  const { dataViews } = useKibana().services;
  const search = name.endsWith('*') ? name : `${name}*`;

  const { isLoading, isError, isSuccess, data } = useQuery({
    queryKey: ['fetchDataViews', search],
    queryFn: async () => {
      return dataViews.find(search, size);
    },
    retry: false,
    keepPreviousData: true,
    refetchOnWindowFocus: false,
  });

  return { isLoading, isError, isSuccess, data };
}
