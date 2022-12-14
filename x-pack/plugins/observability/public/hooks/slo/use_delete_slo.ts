/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';
import { useKibana } from '../../utils/kibana_react';

interface UseDeleteSlo {
  loading: boolean;
  success: boolean;
  error: string;
  deleteSlo: (id: string) => void;
}

export function useDeleteSlo(): UseDeleteSlo {
  const { http } = useKibana().services;
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const deleteSlo = useCallback(async (id: string) => {
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      await http.delete<string>(`/api/observability/slos/${id}`);
      setSuccess(true);
    } catch (e) {
      setError(e);
    }
  }, []);

  return {
    loading,
    error,
    success,
    deleteSlo,
  };
}
