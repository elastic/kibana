/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useKibana } from '../../utils/kibana_react';

export function useDeleteSlo(sloId: string) {
  const { http } = useKibana().services;
  const queryClient = useQueryClient();

  const deleteSlo = useMutation(
    ({ id }: { id: string }) => {
      return http.delete<string>(`/api/observability/slos/${id}`);
    },
    {
      mutationKey: ['deleteSlo', sloId],
      onSuccess: () => {
        queryClient.invalidateQueries(['fetchSloList']);
      },
    }
  );

  return deleteSlo;
}
