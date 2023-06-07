/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type {
  CreateCompositeSLOInput,
  CreateCompositeSLOResponse,
  FindCompositeSLOResponse,
} from '@kbn/slo-schema';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { v1 as uuidv1 } from 'uuid';
import { useKibana } from '../../utils/kibana_react';
import { compositeSloKeys } from '../slo/query_key_factory';

export function useCreateCompositeSlo() {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;
  const queryClient = useQueryClient();

  return useMutation(
    ({ compositeSlo }: { compositeSlo: CreateCompositeSLOInput }) => {
      const body = JSON.stringify(compositeSlo);
      return http.post<CreateCompositeSLOResponse>(`/api/observability/composite_slos`, { body });
    },
    {
      mutationKey: ['createCompositeSlo'],
      onSuccess: (_data, { compositeSlo: { name } }) => {
        toasts.addSuccess(
          i18n.translate('xpack.observability.slo.create.successNotification', {
            defaultMessage: 'Successfully created {name}',
            values: { name },
          })
        );
        queryClient.invalidateQueries(compositeSloKeys.lists());
      },
      onError: (error, { compositeSlo: { name } }) => {
        toasts.addError(new Error(String(error)), {
          title: i18n.translate('xpack.observability.slo.create.errorNotification', {
            defaultMessage: 'Something went wrong while creating {name}',
            values: { name },
          }),
        });
      },
      onMutate: async ({ compositeSlo: slo }) => {
        // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
        await queryClient.cancelQueries(compositeSloKeys.lists());

        const latestQueriesData = (
          queryClient.getQueriesData<FindCompositeSLOResponse>(compositeSloKeys.lists()) || []
        ).at(0);
        const [queryKey, data] = latestQueriesData || [];

        const newItem = { ...slo, id: uuidv1() };
        const optimisticUpdate = {
          ...data,
          results: [...(data?.results ?? []), newItem],
          total: data?.total ? data.total + 1 : 1,
        };

        // Optimistically update to the new value
        queryClient.setQueryData(queryKey ?? compositeSloKeys.lists(), optimisticUpdate);

        // Return a context object with the snapshotted value
        return { previousSloList: data };
      },
    }
  );
}
