/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from 'react-query';
import { i18n } from '@kbn/i18n';

import { useKibana } from '../common/lib/kibana';
import { savedQuerySavedObjectType } from '../../common/types';
import { PLUGIN_ID } from '../../common';
import { pagePathGetters } from '../common/page_paths';
import { SAVED_QUERIES_ID } from './constants';
import { useErrorToast } from '../common/hooks/use_error_toast';

interface UseUpdateSavedQueryProps {
  savedQueryId: string;
}

export const useUpdateSavedQuery = ({ savedQueryId }: UseUpdateSavedQueryProps) => {
  const queryClient = useQueryClient();
  const {
    application: { navigateToApp },
    savedObjects,
    security,
    notifications: { toasts },
  } = useKibana().services;
  const setErrorToast = useErrorToast();

  return useMutation(
    async (payload) => {
      const currentUser = await security.authc.getCurrentUser();

      if (!currentUser) {
        throw new Error('CurrentUser is missing');
      }

      const conflictingEntries = await savedObjects.client.find({
        type: savedQuerySavedObjectType,
        // @ts-expect-error update types
        search: payload.id,
        searchFields: ['id'],
      });
      if (conflictingEntries.savedObjects.length) {
        // @ts-expect-error update types
        throw new Error(`Saved query with id ${payload.id} already exists.`);
      }

      return savedObjects.client.update(savedQuerySavedObjectType, savedQueryId, {
        // @ts-expect-error update types
        ...payload,
        updated_by: currentUser.username,
        updated_at: new Date(Date.now()).toISOString(),
      });
    },
    {
      onError: (error) => {
        // @ts-expect-error update types
        setErrorToast(error, { title: error.body.error, toastMessage: error.body.message });
      },
      onSuccess: (payload) => {
        queryClient.invalidateQueries(SAVED_QUERIES_ID);
        navigateToApp(PLUGIN_ID, { path: pagePathGetters.saved_queries() });
        toasts.addSuccess(
          i18n.translate('xpack.osquery.editSavedQuery.successToastMessageText', {
            defaultMessage: 'Successfully updated "{savedQueryName}" query',
            values: {
              savedQueryName: payload.attributes?.id ?? '',
            },
          })
        );
      },
    }
  );
};
