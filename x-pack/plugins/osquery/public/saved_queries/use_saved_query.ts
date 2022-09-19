/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';

import { PLUGIN_ID } from '../../common';
import { useKibana } from '../common/lib/kibana';
import { pagePathGetters } from '../common/page_paths';
import { useErrorToast } from '../common/hooks/use_error_toast';
import { SAVED_QUERY_ID } from './constants';
import type { SavedQuerySO } from '../routes/saved_queries/list';

interface UseSavedQueryProps {
  savedQueryId: string;
}

export const useSavedQuery = ({ savedQueryId }: UseSavedQueryProps) => {
  const {
    application: { navigateToApp },
    http,
  } = useKibana().services;
  const setErrorToast = useErrorToast();

  return useQuery<
    { data: SavedQuerySO } & {
      error?: {
        error: string;
        message: string;
      };
    },
    { body: { error: string; message: string } },
    SavedQuerySO
  >(
    [SAVED_QUERY_ID, { savedQueryId }],
    () => http.get(`/api/osquery/saved_queries/${savedQueryId}`),
    {
      keepPreviousData: true,
      refetchOnWindowFocus: false,
      select: (response) => response.data,
      onSuccess: (data) => {
        if (data.error) {
          setErrorToast(data.error, {
            title: data.error.error,
            toastMessage: data.error.message,
          });
          navigateToApp(PLUGIN_ID, { path: pagePathGetters.saved_queries() });
        }
      },
      onError: (error: { body: { error: string; message: string } }) => {
        setErrorToast(error, {
          title: error.body.error,
          toastMessage: error.body.message,
        });
      },
    }
  );
};
