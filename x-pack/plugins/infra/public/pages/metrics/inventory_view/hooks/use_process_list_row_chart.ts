/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import { pipe } from 'fp-ts/lib/pipeable';
import { useEffect, useState } from 'react';
import {
  ProcessListAPIChartResponse,
  ProcessListAPIChartResponseRT,
} from '../../../../../common/http_api';
import { throwErrors, createPlainError } from '../../../../../common/runtime_types';
import { useHTTPRequest } from '../../../../hooks/use_http_request';
import { useProcessListContext } from './use_process_list';

export function useProcessListRowChart(command: string) {
  const [inErrorState, setInErrorState] = useState(false);
  const decodeResponse = (response: any) => {
    return pipe(
      ProcessListAPIChartResponseRT.decode(response),
      fold(throwErrors(createPlainError), identity)
    );
  };
  const { hostTerm, indexPattern, to } = useProcessListContext();

  const { error, loading, response, makeRequest } = useHTTPRequest<ProcessListAPIChartResponse>(
    '/api/metrics/process_list/chart',
    'POST',
    JSON.stringify({
      hostTerm,
      indexPattern,
      to,
      command,
    }),
    decodeResponse
  );

  useEffect(() => setInErrorState(true), [error]);
  useEffect(() => setInErrorState(false), [loading]);

  useEffect(() => {
    makeRequest();
  }, [makeRequest]);

  return {
    error: inErrorState,
    loading,
    response,
    makeRequest,
  };
}
