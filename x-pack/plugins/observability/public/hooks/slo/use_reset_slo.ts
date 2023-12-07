/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useMutation } from '@tanstack/react-query';
import { i18n } from '@kbn/i18n';
import { IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';
import { useKibana } from '../../utils/kibana_react';

type ServerError = IHttpFetchError<ResponseErrorBody>;

export function useResetSlo() {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;
  return useMutation<string, ServerError, { id: string; name: string }>(
    ['resetSlo'],
    ({ id }) => {
      try {
        return http.post(`/api/observability/slos/${id}/_reset`);
      } catch (error) {
        return Promise.reject(`Something went wrong: ${String(error)}`);
      }
    },
    {
      onError: (error, { name }) => {
        toasts.addError(new Error(error.body?.message ?? error.message), {
          title: i18n.translate('xpack.observability.slo.slo.reset.errorNotification', {
            defaultMessage: 'Failed to reset {name}',
            values: { name },
          }),
        });
      },
      onSuccess: (_data, { name }) => {
        toasts.addSuccess(
          i18n.translate('xpack.observability.slo.slo.reset.successNotification', {
            defaultMessage: 'Reset {name} successfully',
            values: { name },
          })
        );
      },
    }
  );
}
