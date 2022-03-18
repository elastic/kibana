/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from 'react-query';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../common/lib/kibana';
import { useErrorToast } from '../common/hooks/use_error_toast';
import { PACKS_ID } from '../packs/constants';
import { INTEGRATION_ASSETS_STATUS_ID } from './constants';

export const useImportAssets = () => {
  const queryClient = useQueryClient();
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;
  const setErrorToast = useErrorToast();

  return useMutation(
    () =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      http.post<any>('/internal/osquery/assets/update'),
    {
      onSuccess: () => {
        setErrorToast();
        queryClient.invalidateQueries(PACKS_ID);
        queryClient.invalidateQueries(INTEGRATION_ASSETS_STATUS_ID);
        toasts.addSuccess(
          i18n.translate('xpack.osquery.integrationAssetsImport.successToastMessageText', {
            defaultMessage: 'Successfully imported prebuilt assets',
          })
        );
      },
      onError: (error) => {
        setErrorToast(error);
      },
    }
  );
};
