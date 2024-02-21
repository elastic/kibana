/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useKibana } from '../../../common/lib/kibana';
// import { SAVED_QUERIES_ID } from './constants';
import type { SavedScriptsFormData } from './form/use_saved_query_form';

interface UseCreateSavedScriptProps {
  withRedirect?: boolean;
}

export const useCreateSavedScript = ({ withRedirect }: UseCreateSavedScriptProps) => {
  const queryClient = useQueryClient();
  const {
    // application: { navigateToApp },
    http,
    // notifications: { toasts },
  } = useKibana().services;
  // const setErrorToast = useErrorToast();

  return useMutation<
    { data: any },
    // { data: SavedQuerySO },
    { body: { error: string; message: string } },
    SavedScriptsFormData
  >(
    (payload) => {
      console.log({ payload });
      http.post('/api/endpoint/saved_scripts', {
        version: '2023-10-31',
        body: JSON.stringify(payload),
      });
    },
    {
      onError: (error) => {
        console.log({ error });
        // setErrorToast(error, {
        //   title: error.body.error,
        //   toastMessage: error.body.message,
        // });
      },
      onSuccess: (response) => {
        console.log({ response });
        queryClient.invalidateQueries(['saved-scripts-id']);
        // if (withRedirect) {
        //   navigateToApp(PLUGIN_ID, { path: pagePathGetters.saved_queries() });
        // }

        // toasts.addSuccess(
        //   i18n.translate('xpack.osquery.newSavedQuery.successToastMessageText', {
        //     defaultMessage: 'Successfully saved "{savedQueryId}" query',
        //     values: {
        //       savedQueryId: response.data?.id ?? '',
        //     },
        //   })
        // );
      },
    }
  );
};
