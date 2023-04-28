/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v1 as uuidv1 } from 'uuid';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { i18n } from '@kbn/i18n';
import type { CreateSLOInput, CreateSLOResponse, FindSLOResponse } from '@kbn/slo-schema';

import { useKibana } from '../../utils/kibana_react';

export function useCloneSlo() {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;
  const queryClient = useQueryClient();

  return useMutation<
    CreateSLOResponse,
    string,
    { slo: CreateSLOInput; idToCopyFrom?: string },
    { previousSloList: FindSLOResponse | undefined }
  >(
    ['cloneSlo'],
    ({ slo }: { slo: CreateSLOInput; idToCopyFrom?: string }) => {
      const body = JSON.stringify(slo);
      return http.post<CreateSLOResponse>(`/api/observability/slos`, { body });
    },
    {
      onMutate: async ({ slo, idToCopyFrom }) => {
        // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
        await queryClient.cancelQueries(['fetchSloList']);

        const latestFetchSloListRequest = (
          queryClient.getQueriesData<FindSLOResponse>(['fetchSloList']) || []
        ).at(0);

        const [queryKey, data] = latestFetchSloListRequest || [];

        const sloUsedToClone = data?.results.find((el) => el.id === idToCopyFrom);

        const optimisticUpdate = {
          ...data,
          results: [
            ...(data?.results || []),
            { ...sloUsedToClone, name: slo.name, id: uuidv1(), summary: undefined },
          ],
          total: data?.total && data.total + 1,
        };

        // Optimistically update to the new value
        if (queryKey) {
          queryClient.setQueryData(queryKey, optimisticUpdate);
        }

        toasts.addSuccess(
          i18n.translate('xpack.observability.slo.clone.successNotification', {
            defaultMessage: 'Successfully created {name}',
            values: { name: slo.name },
          })
        );

        // Return a context object with the snapshotted value
        return { previousSloList: data };
      },
      // If the mutation fails, use the context returned from onMutate to roll back
      onError: (_err, { slo }, context) => {
        if (context?.previousSloList) {
          queryClient.setQueryData(['fetchSloList'], context.previousSloList);
        }
        toasts.addDanger(
          i18n.translate('xpack.observability.slo.clone.errorNotification', {
            defaultMessage: 'Failed to clone {name}',
            values: { name: slo.name },
          })
        );
      },
      onSuccess: () => {
        queryClient.invalidateQueries(['fetchSloList']);
      },
    }
  );
}
