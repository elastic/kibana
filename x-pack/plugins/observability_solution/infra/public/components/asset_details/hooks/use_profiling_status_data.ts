/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProfilingStatus } from '@kbn/profiling-utils';
import { useEffect } from 'react';
import { useHTTPRequest } from '../../../hooks/use_http_request';
import { useRequestObservable } from './use_request_observable';

interface Props {
  isActive: boolean;
}

export function useProfilingStatusData({ isActive }: Props) {
  const { request$ } = useRequestObservable<ProfilingStatus>();
  const { loading, error, response, makeRequest } = useHTTPRequest<ProfilingStatus>(
    `/api/infra/profiling/status`,
    'GET',
    undefined,
    undefined,
    undefined,
    undefined,
    true
  );

  useEffect(() => {
    if (!isActive) {
      return;
    }

    request$.next(makeRequest);
  }, [isActive, makeRequest, request$]);

  return {
    loading,
    error,
    response,
  };
}
