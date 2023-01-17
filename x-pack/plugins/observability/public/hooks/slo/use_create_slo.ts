/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';
import type {
  CreateSLOInput,
  CreateSLOResponse,
  UpdateSLOInput,
  UpdateSLOResponse,
} from '@kbn/slo-schema';

import { useKibana } from '../../utils/kibana_react';

interface UseCreateOrUpdateSlo {
  loading: boolean;
  success: boolean;
  error: string | undefined;
  createSlo: (slo: CreateSLOInput) => void;
  updateSlo: (sloId: string, slo: UpdateSLOInput) => void;
}

export function useCreateOrUpdateSlo(): UseCreateOrUpdateSlo {
  const { http } = useKibana().services;
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const createSlo = useCallback(
    async (slo: CreateSLOInput) => {
      setLoading(true);
      setError('');
      setSuccess(false);
      const body = JSON.stringify(slo);

      try {
        await http.post<CreateSLOResponse>(`/api/observability/slos`, { body });
        setSuccess(true);
      } catch (e) {
        setError(e);
      }
    },
    [http]
  );

  const updateSlo = useCallback(
    async (sloId: string, slo: UpdateSLOInput) => {
      setLoading(true);
      setError('');
      setSuccess(false);
      const body = JSON.stringify(slo);

      try {
        await http.put<UpdateSLOResponse>(`/api/observability/slos/${sloId}`, { body });
        setSuccess(true);
      } catch (e) {
        setError(e);
      }
    },
    [http]
  );

  return {
    loading,
    error,
    success,
    createSlo,
    updateSlo,
  };
}
