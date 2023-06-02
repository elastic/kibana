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
            defaultMessage: 'Something went wrong while creating {name}',
            values: { name },
          }),
        });
      },
      onMutate: async ({ slo }) => {
        // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
        await queryClient.cancelQueries(['fetchSloList']);

        const latestFetchSloListRequest = (
          queryClient.getQueriesData<FindSLOResponse>(['fetchSloList']) || []
        ).at(0);

        const [queryKey, data] = latestFetchSloListRequest || [];

        const newItem = { ...slo, id: uuidv1() };

        const optimisticUpdate = {
          ...data,
          results: [...(data?.results || []), { ...newItem }],
          total: data?.total ? data.total + 1 : 1,
        };

        // Optimistically update to the new value
        if (queryKey) {
          queryClient.setQueryData(queryKey, optimisticUpdate);
        }

        // Return a context object with the snapshotted value
        return { previousSloList: data };
      },
    }
  );
}
