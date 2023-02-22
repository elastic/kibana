/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CreateSLOInput, CreateSLOResponse, FindSLOResponse } from '@kbn/slo-schema';

import { useKibana } from '../../utils/kibana_react';

export function useCloneSlo() {
  const { http } = useKibana().services;
  const queryClient = useQueryClient();

  const cloneSlo = useMutation<
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

        // Snapshot the previous value
        const previousSloList = queryClient.getQueryData<FindSLOResponse>(['fetchSloList']);

        const sloUsedToClone = previousSloList?.results.find((el) => el.id === idToCopyFrom);

        // Optimistically update to the new value
        queryClient.setQueryData(['fetchSloList'], () => ({
          ...previousSloList,
          results: [...(previousSloList?.results || []), { ...sloUsedToClone, name: slo.name }],
        }));

        // Return a context object with the snapshotted value
        return { previousSloList };
      },
      // If the mutation fails, use the context returned from onMutate to roll back
      onError: (_err, _slo, context) => {
        if (context?.previousSloList) {
          queryClient.setQueryData(['fetchSloList'], context.previousSloList);
        }
      },
      onSuccess: () => {
        queryClient.invalidateQueries(['fetchSloList']);
        queryClient.invalidateQueries(['fetchHistoricalSummary']);
      },
    }
  );

  return cloneSlo;
}
