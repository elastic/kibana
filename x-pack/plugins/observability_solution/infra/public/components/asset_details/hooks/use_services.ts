/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import { pipe } from 'fp-ts/lib/pipeable';
import { useEffect, useMemo } from 'react';
import {
  ServicesAPIResponse,
  ServicesAPIResponseRT,
  ServicesAPIRequest,
} from '../../../../common/http_api/host_details';
import { throwErrors, createPlainError } from '../../../../common/runtime_types';
import { useHTTPRequest } from '../../../hooks/use_http_request';
import { useRequestObservable } from './use_request_observable';

export function useServices(params: ServicesAPIRequest) {
  const { request$ } = useRequestObservable();
  const decodeResponse = (response: any) => {
    return pipe(
      ServicesAPIResponseRT.decode(response),
      fold(throwErrors(createPlainError), identity)
    );
  };
  const fetchOptions = useMemo(
    () => ({ query: { ...params, filters: JSON.stringify(params.filters) } }),
    [params]
  );
  const { error, loading, response, makeRequest } = useHTTPRequest<ServicesAPIResponse>(
    `/api/infra/services`,
    'GET',
    undefined,
    decodeResponse,
    undefined,
    undefined,
    true,
    fetchOptions
  );

  useEffect(() => {
    if (request$) {
      request$.next(makeRequest);
    } else {
      makeRequest();
    }
  }, [makeRequest, request$]);

  return {
    error,
    loading,
    response,
    makeRequest,
  };
}
