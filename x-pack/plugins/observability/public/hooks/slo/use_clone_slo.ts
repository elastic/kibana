/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { CreateSLOInput, CreateSLOResponse, FindSLOResponse } from '@kbn/slo-schema';
import { QueryKey, useMutation, useQueryClient } from '@tanstack/react-query';
import { v1 as uuidv1 } from 'uuid';
import { useKibana } from '../../utils/kibana_react';
import { sloKeys } from './query_key_factory';

export function useCloneSlo() {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;
  const queryClient = useQueryClient();

  return useMutation<
    CreateSLOResponse,
    string,
    { slo: CreateSLOInput; originalSloId?: string },
    { previousData?: FindSLOResponse; queryKey?: QueryKey }
  >(
    ['cloneSlo'],
    ({ slo }: { slo: CreateSLOInput; originalSloId?: string }) => {
      const body = JSON.stringify(slo);
      return http.post<CreateSLOResponse>(`/api/observability/slos`, { body });
    },
    {
      onMutate: async ({ slo, originalSloId }) => {
        await queryClient.cancelQueries({ queryKey: sloKeys.lists(), exact: false });

        const queriesData = queryClient.getQueriesData<FindSLOResponse>({
          queryKey: sloKeys.lists(),
          exact: false,
        });
        const [queryKey, previousData] = queriesData?.at(0) ?? [];

        const originalSlo = previousData?.results?.find((el) => el.id === originalSloId);
        const optimisticUpdate = {
          page: previousData?.page ?? 1,
          perPage: previousData?.perPage ?? 25,
          total: previousData?.total ? previousData.total + 1 : 1,
          results: [
            ...(previousData?.results ?? []),
            { ...originalSlo, name: slo.name, id: uuidv1(), summary: undefined },
          ],
        };

        if (queryKey) {
          queryClient.setQueryData(queryKey, optimisticUpdate);
        }

        return { queryKey, previousData };
      },
      // If the mutation fails, use the context returned from onMutate to roll back
      onError: (_err, { slo }, context) => {
        if (context?.previousData && context?.queryKey) {
          queryClient.setQueryData(context.queryKey, context.previousData);
        }
        toasts.addDanger(
          i18n.translate('xpack.observability.slo.clone.errorNotification', {
            defaultMessage: 'Failed to clone {name}',
            values: { name: slo.name },
          })
        );
      },
      onSuccess: (_data, { slo }) => {
        toasts.addSuccess(
          i18n.translate('xpack.observability.slo.clone.successNotification', {
            defaultMessage: 'Successfully created {name}',
            values: { name: slo.name },
          })
        );
      },
    }
  );
}
