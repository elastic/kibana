/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useKibana } from '../utils/kibana_react';
import { sloKeys } from './query_key_factory';

type ServerError = IHttpFetchError<ResponseErrorBody>;

export function useDeleteSloInstance() {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;
  const queryClient = useQueryClient();

  return useMutation<string, ServerError, { slo: SLOWithSummaryResponse; excludeRollup: boolean }>(
    ['deleteSloInstance'],
    ({ slo, excludeRollup }) => {
      try {
        return http.post(`/api/observability/slos/_delete_instances`, {
          body: JSON.stringify({
            list: [
              {
                sloId: slo.id,
                instanceId: slo.instanceId,
                excludeRollup,
              },
            ],
          }),
        });
      } catch (error) {
        return Promise.reject(`Something went wrong: ${String(error)}`);
      }
    },
    {
      onError: (error, { slo }) => {
        toasts.addError(new Error(error.body?.message ?? error.message), {
          title: i18n.translate('xpack.slo.deleteInstance.errorNotification', {
            defaultMessage: 'Failed to delete {name} [instance: {instanceId}]',
            values: { name: slo.name, instanceId: slo.instanceId },
          }),
        });
      },
      onSuccess: (_data, { slo }) => {
        queryClient.invalidateQueries({ queryKey: sloKeys.lists(), exact: false });

        toasts.addSuccess(
          i18n.translate('xpack.slo.slo.deleteInstance.successNotification', {
            defaultMessage: 'Deleted {name} [instance: {instanceId}]',
            values: { name: slo.name, instanceId: slo.instanceId },
          })
        );
      },
    }
  );
}
