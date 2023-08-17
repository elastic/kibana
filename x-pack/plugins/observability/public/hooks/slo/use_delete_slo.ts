/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryKey, useMutation, useQueryClient } from '@tanstack/react-query';
import { i18n } from '@kbn/i18n';
import { FindSLOResponse } from '@kbn/slo-schema';
import { useKibana } from '../../utils/kibana_react';
import { sloKeys } from './query_key_factory';

export function useDeleteSlo() {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;
  const queryClient = useQueryClient();

  return useMutation<
    string,
    string,
    { id: string; name: string },
    { previousData?: FindSLOResponse; queryKey?: QueryKey }
  >(
    ['deleteSlo'],
    ({ id }) => {
      try {
        return http.delete<string>(`/api/observability/slos/${id}`);
      } catch (error) {
        return Promise.reject(`Something went wrong: ${String(error)}`);
      }
    },
    {
      onMutate: async (slo) => {
        await queryClient.cancelQueries({ queryKey: sloKeys.lists(), exact: false });

        const queriesData = queryClient.getQueriesData<FindSLOResponse>({
          queryKey: sloKeys.lists(),
          exact: false,
        });
        const [queryKey, previousData] = queriesData?.at(0) ?? [];

        const optimisticUpdate = {
          page: previousData?.page ?? 1,
          perPage: previousData?.perPage ?? 25,
          total: previousData?.total ? previousData.total - 1 : 0,
          results: previousData?.results?.filter((result) => result.id !== slo.id) ?? [],
        };

        if (queryKey) {
          queryClient.setQueryData(queryKey, optimisticUpdate);
        }

        return { previousData, queryKey };
      },
      // If the mutation fails, use the context returned from onMutate to roll back
      onError: (_err, { name }, context) => {
        if (context?.previousData && context?.queryKey) {
          queryClient.setQueryData(context.queryKey, context.previousData);
        }

        toasts.addDanger(
          i18n.translate('xpack.observability.slo.slo.delete.errorNotification', {
            defaultMessage: 'Failed to delete {name}',
            values: { name },
          })
        );
      },
      onSuccess: (_data, { name }) => {
        toasts.addSuccess(
          i18n.translate('xpack.observability.slo.slo.delete.successNotification', {
            defaultMessage: 'Deleted {name}',
            values: { name },
          })
        );
      },
    }
  );
}
