/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from 'react-query';
import { i18n } from '@kbn/i18n';

import { useKibana } from '../common/lib/kibana';
import { PLUGIN_ID } from '../../common';
import { pagePathGetters } from '../common/page_paths';
import { PACKS_ID } from './constants';
import { useErrorToast } from '../common/hooks/use_error_toast';

interface UseDeletePackProps {
  packId: string;
  withRedirect?: boolean;
}

export const useDeletePack = ({ packId, withRedirect }: UseDeletePackProps) => {
  const queryClient = useQueryClient();
  const {
    application: { navigateToApp },
    http,
    notifications: { toasts },
  } = useKibana().services;
  const setErrorToast = useErrorToast();

  return useMutation(() => http.delete(`/internal/osquery/packs/${packId}`), {
    onError: (error: { body: { error: string; message: string } }) => {
      setErrorToast(error, {
        title: error.body.error,
        toastMessage: error.body.message,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(PACKS_ID);
      if (withRedirect) {
        navigateToApp(PLUGIN_ID, { path: pagePathGetters.packs() });
      }
      toasts.addSuccess(
        i18n.translate('xpack.osquery.deletePack.successToastMessageText', {
          defaultMessage: 'Successfully deleted pack',
        })
      );
    },
  });
};
