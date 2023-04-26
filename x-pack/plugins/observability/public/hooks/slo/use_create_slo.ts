/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { i18n } from '@kbn/i18n';
import type { CreateSLOInput, CreateSLOResponse } from '@kbn/slo-schema';

import { useKibana } from '../../utils/kibana_react';

export function useCreateSlo() {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;
  const queryClient = useQueryClient();

  return useMutation(
    ({ slo }: { slo: CreateSLOInput }) => {
      const body = JSON.stringify(slo);
      return http.post<CreateSLOResponse>(`/api/observability/slos`, { body });
    },
    {
      mutationKey: ['createSlo'],
      onSuccess: (_data, { slo: { name } }) => {
        toasts.addSuccess(
          i18n.translate('xpack.observability.slo.create.successNotification', {
            defaultMessage: 'Successfully created {name}',
            values: { name },
          })
        );
        queryClient.invalidateQueries(['fetchSloList']);
      },
      onError: (error, { slo: { name } }) => {
        toasts.addError(new Error(String(error)), {
          title: i18n.translate('xpack.observability.slo.create.errorNotification', {
            defaultMessage: 'Something went wrong',
          }),
        });
      },
    }
  );
}
