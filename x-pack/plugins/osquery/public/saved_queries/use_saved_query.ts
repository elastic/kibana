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

export const SAVED_QUERY_ID = 'savedQuery';

interface UseSavedQueryProps {
  savedQueryId: string;
}

export const useSavedQuery = ({ savedQueryId }: UseSavedQueryProps) => {
  const {
    application: { navigateToApp },
    savedObjects,
    notifications: { toasts },
  } = useKibana().services;

  return useQuery(
    [SAVED_QUERY_ID, { savedQueryId }],
    async () => savedObjects.client.get(savedQuerySavedObjectType, savedQueryId),
    {
      keepPreviousData: true,
      onSuccess: (data) => {
        console.error('useSavedQuery', data);
        if (data.error) {
          toasts.addError(data.error, {
            title: data.error.error,
            toastMessage: data.error.message,
          });
          navigateToApp(PLUGIN_ID, { path: pagePathGetters.saved_queries() });
        }
      },
      onError: (error) => {
        // @ts-expect-error update types
        toasts.addError(error, { title: error.body.error, toastMessage: error.body.message });
      },
    }
  );
};
