/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { FindSLOResponse, UpdateSLOInput, UpdateSLOResponse } from '@kbn/slo-schema';
import { QueryKey, useMutation, useQueryClient } from '@tanstack/react-query';
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
    { previousData?: FindSLOResponse; queryKey?: QueryKey }
  >(
    ['updateSlo'],
    ({ sloId, slo }) => {
      const body = JSON.stringify(slo);
      return http.put<UpdateSLOResponse>(`/api/observability/slos/${sloId}`, { body });
    },
    {
      onMutate: async ({ sloId, slo }) => {
        await queryClient.cancelQueries({ queryKey: sloKeys.lists(), exact: false });

        const queriesData = queryClient.getQueriesData<FindSLOResponse>({
          queryKey: sloKeys.lists(),
          exact: false,
        });
        const [queryKey, previousData] = queriesData?.at(0) ?? [];

        const updatedItem = { ...slo, id: sloId };
        const optimisticUpdate = {
          page: previousData?.page ?? 1,
          perPage: previousData?.perPage ?? 25,
          total: previousData?.total ? previousData.total : 1,
          results: [
            ...(previousData?.results?.filter((result) => result.id !== sloId) ?? []),
            updatedItem,
          ],
        };

        if (queryKey) {
          queryClient.setQueryData(queryKey, optimisticUpdate);
        }

        return { previousData, queryKey };
      },
      onSuccess: (_data, { slo: { name } }) => {
        toasts.addSuccess(
          i18n.translate('xpack.observability.slo.update.successNotification', {
            defaultMessage: 'Successfully updated {name}',
            values: { name },
          })
        );
      },
      onError: (error, { slo: { name } }, context) => {
        if (context?.previousData && context?.queryKey) {
          queryClient.setQueryData(context.queryKey, context.previousData);
        }

        toasts.addError(new Error(String(error)), {
          title: i18n.translate('xpack.observability.slo.update.errorNotification', {
            defaultMessage: 'Something went wrong when updating {name}',
            values: { name },
          }),
        });
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: sloKeys.lists(), exact: false });
      },
    }
  );
}
