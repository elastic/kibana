/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  CreateSLOInput,
  CreateSLOResponse,
  UpdateSLOInput,
  UpdateSLOResponse,
} from '@kbn/slo-schema';

import { useKibana } from '../../utils/kibana_react';

export function useCreateOrUpdateSlo() {
  const { http } = useKibana().services;
  const queryClient = useQueryClient();

  const createSlo = useMutation(
    ({ slo }: { slo: CreateSLOInput }) => {
      const body = JSON.stringify(slo);
      return http.post<CreateSLOResponse>(`/api/observability/slos`, { body });
    },
    {
      mutationKey: ['createSlo'],
      onSuccess: () => {
        queryClient.invalidateQueries(['fetchSloList']);
      },
    }
  );

  const updateSlo = useMutation(
    ({ sloId, slo }: { sloId: string; slo: UpdateSLOInput }) => {
      const body = JSON.stringify(slo);
      return http.put<UpdateSLOResponse>(`/api/observability/slos/${sloId}`, { body });
    },
    {
      mutationKey: ['updateSlo'],
      onSuccess: () => {
        queryClient.invalidateQueries(['fetchSloList']);
      },
    }
  );

  return { createSlo, updateSlo };
}
