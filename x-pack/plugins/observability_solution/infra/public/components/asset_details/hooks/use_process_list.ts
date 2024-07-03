/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import createContainter from 'constate';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import { pipe } from 'fp-ts/lib/pipeable';
import { useEffect } from 'react';
import { BehaviorSubject } from 'rxjs';
import { ProcessListAPIResponse, ProcessListAPIResponseRT } from '../../../../common/http_api';
import { throwErrors, createPlainError } from '../../../../common/runtime_types';
import { useHTTPRequest } from '../../../hooks/use_http_request';
import { useMetricsDataViewContext } from '../../../containers/metrics_source';

export interface SortBy {
  name: string;
  isAscending: boolean;
}

export function useProcessList(
  hostTerm: Record<string, string>,
  to: number,
  sortBy: SortBy,
  searchFilter: object,
  sourceId: string,
  request$?: BehaviorSubject<(() => Promise<unknown>) | undefined>
) {
  const decodeResponse = (response: any) => {
    return pipe(
      ProcessListAPIResponseRT.decode(response),
      fold(throwErrors(createPlainError), identity)
    );
  };

  const parsedSortBy =
    sortBy.name === 'runtimeLength'
      ? {
          ...sortBy,
          name: 'startTime',
        }
      : sortBy;

  const { error, loading, response, makeRequest } = useHTTPRequest<ProcessListAPIResponse>(
    '/api/metrics/process_list',
    'POST',
    JSON.stringify({
      hostTerm,
      sourceId,
      to,
      sortBy: parsedSortBy,
      searchFilter,
    }),
    decodeResponse,
    undefined,
    undefined,
    true
  );

  useEffect(() => {
    if (request$) {
      request$.next(makeRequest);
    } else {
      makeRequest();
    }
  }, [makeRequest, request$]);

  return {
    error: (error && error.message) || null,
    loading,
    response,
    makeRequest,
  };
}

function useProcessListParams(props: { hostTerm: Record<string, string>; to: number }) {
  const { hostTerm, to } = props;
  const { metricsView } = useMetricsDataViewContext();
  return { hostTerm, indexPattern: metricsView?.indices, to };
}
const ProcessListContext = createContainter(useProcessListParams);
export const [ProcessListContextProvider, useProcessListContext] = ProcessListContext;
