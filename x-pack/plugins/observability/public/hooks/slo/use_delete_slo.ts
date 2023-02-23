/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FindSLOResponse } from '@kbn/slo-schema';

import { useKibana } from '../../utils/kibana_react';

export function useDeleteSlo(sloId: string) {
  const { http } = useKibana().services;
  const queryClient = useQueryClient();

  const deleteSlo = useMutation<
    string,
    string,
    { id: string },
    { previousSloList: FindSLOResponse | undefined }
  >(
    ['deleteSlo', sloId],
    ({ id }) => {
      try {
        return http.delete<string>(`/api/observability/slos/${id}`);
      } catch (error) {
        return Promise.reject(`Something went wrong: ${String(error)}`);
      }
    },
    {
      onMutate: async (slo) => {
        // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
        await queryClient.cancelQueries(['fetchSloList']);

        const latestFetchSloListRequest = (
          queryClient.getQueriesData<FindSLOResponse>(['fetchSloList']) || []
        ).at(0);

        const [queryKey, data] = latestFetchSloListRequest || [];

        const optimisticUpdate = {
          ...data,
          results: data?.results.filter((result) => result.id !== slo.id),
          total: data?.total && data.total - 1,
        };

        // Optimistically update to the new value
        if (queryKey) {
          queryClient.setQueryData(queryKey, optimisticUpdate);
        }

        // Return a context object with the snapshotted value
        return { previousSloList: data };
      },
      // If the mutation fails, use the context returned from onMutate to roll back
      onError: (_err, _slo, context) => {
        if (context?.previousSloList) {
          queryClient.setQueryData(['fetchSloList'], context.previousSloList);
        }
      },
      onSuccess: () => {
        queryClient.invalidateQueries(['fetchSloList']);
      },
    }
  );

  return deleteSlo;
}
