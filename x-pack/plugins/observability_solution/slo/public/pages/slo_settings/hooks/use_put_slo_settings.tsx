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
import { paths } from '../../../../common/locators/paths';
import { usePluginContext } from '../../../hooks/use_plugin_context';
import { useKibana } from '../../../hooks/use_kibana';

type ServerError = IHttpFetchError<ResponseErrorBody>;

export function usePutSloSettings() {
  const {
    application: { navigateToUrl },
    http,
    notifications: { toasts },
  } = useKibana().services;
  const { sloClient } = usePluginContext();

  return useMutation<PutSLOSettingsResponse, ServerError, { settings: PutSLOSettingsParams }>(
    ['putSloSettings'],
    ({ settings }) => {
      return sloClient.fetch(`PUT /internal/slo/settings`, {
        params: { body: settings },
      });
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
