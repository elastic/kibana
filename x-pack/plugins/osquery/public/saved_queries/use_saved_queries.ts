/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';

import { API_VERSIONS } from '../../common/constants';
import { useKibana } from '../common/lib/kibana';
import { useErrorToast } from '../common/hooks/use_error_toast';
import { SAVED_QUERIES_ID } from './constants';
import type { SavedQuerySO } from '../routes/saved_queries/list';

export const useSavedQueries = ({
  isLive = false,
  pageIndex = 0,
  pageSize = 10000,
  sortField = 'updated_at',
  sortOrder = 'desc',
}) => {
  const { http } = useKibana().services;
  const setErrorToast = useErrorToast();

  return useQuery<
    {
      total: number;
      perPage: number;
      page: number;
      data: SavedQuerySO[];
    },
    { body: { error: string; message: string } }
  >(
    [SAVED_QUERIES_ID, { pageIndex, pageSize, sortField, sortOrder }],
    () =>
      http.get('/api/osquery/saved_queries', {
        version: API_VERSIONS.public.v1,
        query: { page: pageIndex + 1, pageSize, sort: sortField, sortOrder },
      }),
    {
      keepPreviousData: true,
      refetchInterval: isLive ? 10000 : false,
      onError: (error) => {
        setErrorToast(error, {
          title: error.body.error,
          toastMessage: error.body.message,
        });
      },
      refetchOnWindowFocus: !!isLive,
    }
  );
};
