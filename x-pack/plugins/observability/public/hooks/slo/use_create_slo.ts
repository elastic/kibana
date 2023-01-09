/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';
import type { CreateSLOParams, CreateSLOResponse } from '@kbn/slo-schema';

import { useKibana } from '../../utils/kibana_react';

interface UseCreateSlo {
  loading: boolean;
  success: boolean;
  error: string | undefined;
  createSlo: (slo: CreateSLOParams) => void;
}

export function useCreateSlo(): UseCreateSlo {
  const { http } = useKibana().services;
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const createSlo = useCallback(
    async (slo: CreateSLOParams) => {
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

  return {
    loading,
    error,
    success,
    createSlo,
  };
}
