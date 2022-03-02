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
import { useEffect, useState } from 'react';
import { ProcessListAPIResponse, ProcessListAPIResponseRT } from '../../../../../common/http_api';
import { throwErrors, createPlainError } from '../../../../../common/runtime_types';
import { useHTTPRequest } from '../../../../hooks/use_http_request';
import { useSourceContext } from '../../../../containers/metrics_source';

export interface SortBy {
  name: string;
  isAscending: boolean;
}

export function useProcessList(
  hostTerm: Record<string, string>,
  to: number,
  sortBy: SortBy,
  searchFilter: object
) {
  const { createDerivedIndexPattern } = useSourceContext();
  const indexPattern = createDerivedIndexPattern().title;

  const [inErrorState, setInErrorState] = useState(false);
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
      indexPattern,
      to,
      sortBy: parsedSortBy,
      searchFilter,
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

function useProcessListParams(props: { hostTerm: Record<string, string>; to: number }) {
  const { hostTerm, to } = props;
  const { createDerivedIndexPattern } = useSourceContext();
  const indexPattern = createDerivedIndexPattern().title;
  return { hostTerm, indexPattern, to };
}
const ProcessListContext = createContainter(useProcessListParams);
export const [ProcessListContextProvider, useProcessListContext] = ProcessListContext;
