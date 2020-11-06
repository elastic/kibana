/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import { pipe } from 'fp-ts/lib/pipeable';
import { useEffect } from 'react';
import { ProcessListAPIResponse, ProcessListAPIResponseRT } from '../../../../../common/http_api';
import { throwErrors, createPlainError } from '../../../../../common/runtime_types';
import { useHTTPRequest } from '../../../../hooks/use_http_request';

export function useProcessList(
  hostTerm: string,
  indexPattern: string,
  timefield: string,
  to: number
) {
  const decodeResponse = (response: any) => {
    return pipe(
      ProcessListAPIResponseRT.decode(response),
      fold(throwErrors(createPlainError), identity)
    );
  };

  const timerange = {
    timefield,
    interval: 'modules',
    to,
    from: to - 15 * 60 * 1000, // 15 minutes
  };

  const { error, loading, response, makeRequest } = useHTTPRequest<ProcessListAPIResponse>(
    '/api/metrics/process_list',
    'POST',
    JSON.stringify({
      hostTerm,
      timerange,
      indexPattern,
    }),
    decodeResponse
  );

  useEffect(() => {
    makeRequest();
  }, [makeRequest]);

  return {
    error,
    loading,
    response,
    makeRequest,
  };
}
