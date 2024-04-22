/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { DataViewListItem } from '@kbn/data-views-plugin/public';
import { useKibana } from '../utils/kibana_react';

export interface UseFetchDataViewsResponse {
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  data: DataViewListItem[] | undefined;
}

export function useFetchDataViews(): UseFetchDataViewsResponse {
  const { dataViews } = useKibana().services;

  const { isLoading, isError, isSuccess, data } = useQuery({
    queryKey: ['fetchDataViewsList'],
    queryFn: async () => {
      return dataViews.getIdsWithTitle();
    },
    retry: false,
    keepPreviousData: true,
    refetchOnWindowFocus: false,
  });

  return { isLoading, isError, isSuccess, data };
}
