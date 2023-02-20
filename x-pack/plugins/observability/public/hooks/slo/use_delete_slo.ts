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

  const deleteSlo = useMutation(
    ['deleteSlo', sloId],
    ({ id }: { id: string }) => {
      return http.delete<string>(`/api/observability/slos/${id}`);
    },
    {
      onMutate: async (slo) => {
        // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
        await queryClient.cancelQueries(['fetchSloList']);

        // Snapshot the previous value
        const previousSloList = queryClient.getQueryData<FindSLOResponse>(['fetchSloList']);

        // Optimistically update to the new value
        queryClient.setQueryData(['fetchSloList'], () => ({
          ...previousSloList,
          results: previousSloList?.results.filter((result) => result.id !== slo.id),
        }));

        // Return a context object with the snapshotted value
        return { previousSloList };
      },
      // If the mutation fails, use the context returned from onMutate to roll back
      onError: (_err, _slo, context: { previousSloList: FindSLOResponse | undefined }) => {
        if (context.previousSloList) {
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
