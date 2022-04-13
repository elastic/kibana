/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from 'react-query';

import { useKibana } from '../common/lib/kibana';
import { useErrorToast } from '../common/hooks/use_error_toast';
import { SAVED_QUERIES_ID } from './constants';

export const useSavedQueries = ({
  isLive = false,
  pageIndex = 0,
  pageSize = 10000,
  sortField = 'updated_at',
  sortDirection = 'desc',
}) => {
  const { http } = useKibana().services;
  const setErrorToast = useErrorToast();

  return useQuery(
    [SAVED_QUERIES_ID, { pageIndex, pageSize, sortField, sortDirection }],
    () =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      http.get<any>('/internal/osquery/saved_query', {
        query: { pageIndex, pageSize, sortField, sortDirection },
      }),
    {
      keepPreviousData: true,
      refetchInterval: isLive ? 10000 : false,
      onError: (error: { body: { error: string; message: string } }) => {
        setErrorToast(error, {
          title: error.body.error,
          toastMessage: error.body.message,
        });
      },
      refetchOnWindowFocus: !!isLive,
    }
  );
};
