/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { i18n } from '@kbn/i18n';

import { API_VERSIONS } from '../../common/constants';
import { useKibana } from '../common/lib/kibana';
import { PLUGIN_ID } from '../../common';
import { pagePathGetters } from '../common/page_paths';
import { SAVED_QUERIES_ID } from './constants';
import { useErrorToast } from '../common/hooks/use_error_toast';
import type { SavedQuerySO } from '../routes/saved_queries/list';
import type { SavedQuerySOFormData } from './form/use_saved_query_form';

interface UseCreateSavedQueryProps {
  withRedirect?: boolean;
}

export const useCreateSavedQuery = ({ withRedirect }: UseCreateSavedQueryProps) => {
  const queryClient = useQueryClient();
  const {
    application: { navigateToApp },
    http,
    notifications: { toasts },
  } = useKibana().services;
  const setErrorToast = useErrorToast();

  return useMutation<
    { data: SavedQuerySO },
    { body: { error: string; message: string } },
    SavedQuerySOFormData
  >(
    (payload) =>
      http.post('/api/osquery/saved_queries', {
        version: API_VERSIONS.public.v1,
        body: JSON.stringify(payload),
      }),
    {
      onError: (error) => {
        setErrorToast(error, {
          title: error.body.error,
          toastMessage: error.body.message,
        });
      },
      onSuccess: (response) => {
        queryClient.invalidateQueries([SAVED_QUERIES_ID]);
        if (withRedirect) {
          navigateToApp(PLUGIN_ID, { path: pagePathGetters.saved_queries() });
        }

        toasts.addSuccess(
          i18n.translate('xpack.osquery.newSavedQuery.successToastMessageText', {
            defaultMessage: 'Successfully saved "{savedQueryId}" query',
            values: {
              savedQueryId: response.data?.id ?? '',
            },
          })
        );
      },
    }
  );
};
