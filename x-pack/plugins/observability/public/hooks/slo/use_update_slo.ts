/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { FindSLOResponse, UpdateSLOInput, UpdateSLOResponse } from '@kbn/slo-schema';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useKibana } from '../../utils/kibana_react';
import { sloKeys } from './query_key_factory';

export function useUpdateSlo() {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;
  const queryClient = useQueryClient();

  return useMutation<
    UpdateSLOResponse,
    string,
    { sloId: string; slo: UpdateSLOInput },
    { previousSloList: FindSLOResponse | undefined }
  >(
    ['updateSlo'],
    ({ sloId, slo }) => {
      const body = JSON.stringify(slo);
      return http.put<UpdateSLOResponse>(`/api/observability/slos/${sloId}`, { body });
    },
    {
      onMutate: async ({ sloId, slo }) => {
        // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
        await queryClient.cancelQueries(sloKeys.lists());

        const latestQueriesData = (
          queryClient.getQueriesData<FindSLOResponse>(sloKeys.lists()) ?? []
        ).at(0);

        const [queryKey, data] = latestQueriesData || [];
        const updatedItem = { ...slo, id: sloId };
        const optimisticUpdate = {
          ...data,
          results: [...(data?.results?.filter((result) => result.id !== sloId) ?? []), updatedItem],
          total: data?.total ? data.total : 1,
        };

        queryClient.setQueryData(queryKey ?? sloKeys.lists(), optimisticUpdate);

        // Return a context object with the snapshotted value
        return { previousSloList: data };
      },
      onSuccess: (_data, { slo: { name } }) => {
        queryClient.invalidateQueries(sloKeys.lists());

        toasts.addSuccess(
          i18n.translate('xpack.observability.slo.update.successNotification', {
            defaultMessage: 'Successfully updated {name}',
            values: { name },
          })
        );
      },
      onError: (error, { slo: { name } }, context) => {
        if (context?.previousSloList) {
          queryClient.setQueryData(sloKeys.lists(), context.previousSloList);
        }

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
