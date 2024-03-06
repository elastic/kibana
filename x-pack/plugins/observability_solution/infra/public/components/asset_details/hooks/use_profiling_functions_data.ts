/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo } from 'react';
import type { TopNFunctions } from '@kbn/profiling-utils';
import { type InfraProfilingFunctionsRequestParams } from '../../../../common/http_api/profiling_api';
import { useHTTPRequest } from '../../../hooks/use_http_request';
import { useRequestObservable } from './use_request_observable';

interface Props {
  params: InfraProfilingFunctionsRequestParams;
  isActive: boolean;
}

export function useProfilingFunctionsData({ params, isActive }: Props) {
  const { request$ } = useRequestObservable<TopNFunctions>();
  const fetchOptions = useMemo(() => ({ query: params }), [params]);
  const { loading, error, response, makeRequest } = useHTTPRequest<TopNFunctions>(
    '/api/infra/profiling/functions',
    'GET',
    undefined,
    undefined,
    undefined,
    undefined,
    true,
    fetchOptions
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
