/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { PutSLOSettingsParams, PutSLOSettingsResponse } from '@kbn/slo-schema';
import { useMutation } from '@tanstack/react-query';
import { paths } from '../../../common/locators/paths';
import { useKibana } from '../../utils/kibana_react';

type ServerError = IHttpFetchError<ResponseErrorBody>;

export function usePutSloSettings() {
  const {
    application: { navigateToUrl },
    http,
    notifications: { toasts },
  } = useKibana().services;

  return useMutation<PutSLOSettingsResponse, ServerError, { settings: PutSLOSettingsParams }>(
    ['putSloSettings'],
    ({ settings }) => {
      const body = JSON.stringify(settings);
      return http.put<PutSLOSettingsResponse>(`/internal/slo/settings`, { body });
    },
    {
      onSuccess: (data, { settings }) => {
        toasts.addSuccess({
          title: i18n.translate('xpack.slo.settings.successNotification', {
            defaultMessage: 'Success updated slo settings',
          }),
        });
        navigateToUrl(http.basePath.prepend(paths.slos));
      },
      onError: (error, { settings }, context) => {
        toasts.addError(new Error(error.body?.message ?? error.message), {
          title: i18n.translate('xpack.slo.settings.errorNotification', {
            defaultMessage: 'Something went wrong while updating settings',
          }),
        });
      },
    }
  );
}
