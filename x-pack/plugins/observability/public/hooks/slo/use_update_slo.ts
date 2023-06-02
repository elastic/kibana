/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { i18n } from '@kbn/i18n';
import type { UpdateSLOInput, UpdateSLOResponse } from '@kbn/slo-schema';

import { useKibana } from '../../utils/kibana_react';

export function useUpdateSlo() {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;
  const queryClient = useQueryClient();

  return useMutation(
    ({ sloId, slo }: { sloId: string; slo: UpdateSLOInput }) => {
      const body = JSON.stringify(slo);
      return http.put<UpdateSLOResponse>(`/api/observability/slos/${sloId}`, { body });
    },
    {
      mutationKey: ['updateSlo'],
      onSuccess: (_data, { slo: { name } }) => {
        toasts.addSuccess(
          i18n.translate('xpack.observability.slo.update.successNotification', {
            defaultMessage: 'Successfully updated {name}',
            values: { name },
          })
        );
        queryClient.invalidateQueries(['fetchSloList']);
        queryClient.invalidateQueries(['fetchHistoricalSummary']);
      },
      onError: (error, { slo: { name } }) => {
        toasts.addError(new Error(String(error)), {
          title: i18n.translate('xpack.observability.slo.update.errorNotification', {
            defaultMessage: 'Something went wrong when updating {name}',
            values: { name },
          }),
        });
      },
    }
  );
}
