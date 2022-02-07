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

export const createReactQueryResponse = <TData = unknown, TError = unknown>({
  status = 'loading',
  error = undefined,
  data = undefined,
}: CreateReactQueryResponseInput<TData, TError> = {}): UseQueryResult<TData, TError> => {
  if (status === 'success') {
    return { status, data } as UseQueryResult<TData, TError>;
  }

  if (status === 'error') {
    return { status, error } as UseQueryResult<TData, TError>;
  }

  return { status } as UseQueryResult<TData, TError>;
};
