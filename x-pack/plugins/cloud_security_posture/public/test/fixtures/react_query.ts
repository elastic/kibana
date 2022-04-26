/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryResult } from 'react-query/types/react/types';

interface CreateReactQueryResponseInput<TData = unknown, TError = unknown> {
  status?: UseQueryResult['status'];
  data?: TData;
  error?: TError;
}

// TODO: Consider alternatives to using `Partial` over `UseQueryResult` for the return type:
//  1. Fully mock `UseQueryResult`
//  2. Mock the network layer instead of `useQuery` - see: https://tkdodo.eu/blog/testing-react-query
export const createReactQueryResponse = <TData = unknown, TError = unknown>({
  status = 'loading',
  error = undefined,
  data = undefined,
}: CreateReactQueryResponseInput<TData, TError> = {}): Partial<UseQueryResult<TData, TError>> => {
  if (status === 'success') {
    return { status, data, isSuccess: true, isLoading: false, isError: false };
  }

  if (status === 'error') {
    return { status, error, isSuccess: false, isLoading: false, isError: true };
  }

  if (status === 'loading') {
    return { status, data: undefined, isSuccess: false, isLoading: true, isError: false };
  }

  return { status };
};
