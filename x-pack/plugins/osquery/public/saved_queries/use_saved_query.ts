/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from 'react-query';

import { PLUGIN_ID } from '../../common';
import { useKibana } from '../common/lib/kibana';
import { savedQuerySavedObjectType } from '../../common/types';
import { pagePathGetters } from '../common/page_paths';
import { useErrorToast } from '../common/hooks/use_error_toast';
import { SAVED_QUERY_ID } from './constants';

interface UseSavedQueryProps {
  savedQueryId: string;
}

export const useSavedQuery = ({ savedQueryId }: UseSavedQueryProps) => {
  const {
    application: { navigateToApp },
    savedObjects,
  } = useKibana().services;
  const setErrorToast = useErrorToast();

  return useQuery(
    [SAVED_QUERY_ID, { savedQueryId }],
    async () =>
      savedObjects.client.get<{
        id: string;
        description?: string;
        query: string;
      }>(savedQuerySavedObjectType, savedQueryId),
    {
      keepPreviousData: true,
      onSuccess: (data) => {
        if (data.error) {
          setErrorToast(data.error, {
            title: data.error.error,
            toastMessage: data.error.message,
          });
          navigateToApp(PLUGIN_ID, { path: pagePathGetters.saved_queries() });
        }
      },
      onError: (error) => {
        // @ts-expect-error update types
        setErrorToast(error, { title: error.body.error, toastMessage: error.body.message });
      },
    }
  );
};
