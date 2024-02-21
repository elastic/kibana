/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { useKibana } from '../../../common/lib/kibana';

export const useSavedScripts = ({
  isLive = false,
  pageIndex = 0,
  pageSize = 10000,
  sortField = 'updated_at',
  sortOrder = 'desc',
}) => {
  const { http } = useKibana().services;
  // const setErrorToast = useErrorToast();

  return useQuery<
    {
      total: number;
      perPage: number;
      page: number;
      data: any[];
      // data: SavedQuerySO[];
    },
    { body: { error: string; message: string } }
  >(
    ['saved-scripts-id', { pageIndex, pageSize, sortField, sortOrder }],
    () =>
      http.get('/api/endpoint/saved_scripts', {
        version: '2023-10-31',
        // version: API_VERSIONS.public.v1,
        query: { page: pageIndex + 1, pageSize, sort: sortField, sortOrder },
      }),
    {
      keepPreviousData: true,
      refetchInterval: isLive ? 10000 : false,
      onError: (error) => {
        console.log({ error });
        // setErrorToast(error, {
        //   title: error.body.error,
        //   toastMessage: error.body.message,
        // });
      },
      refetchOnWindowFocus: !!isLive,
    }
  );
};
