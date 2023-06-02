/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { AbortError } from '@kbn/kibana-utils-plugin/common';
import { useCallback, useEffect, useState } from 'react';
import { AutoAbortedHttpService, useAutoAbortedHttpClient } from './use_auto_aborted_http_client';

export enum AsyncStatus {
  Loading = 'loading',
  Init = 'init',
  Settled = 'settled',
}

export interface AsyncState<T> {
  data?: T;
  error?: Error;
  status: AsyncStatus;
  refresh: () => void;
}

export type UseAsync = <T>(
  fn: ({ http }: { http: AutoAbortedHttpService }) => Promise<T> | undefined,
  dependencies: any[]
) => AsyncState<T>;

export const useAsync: UseAsync = (fn, dependencies) => {
  const [refreshId, setRefreshId] = useState(0);

  const refresh = useCallback(() => {
    setRefreshId((id) => id + 1);
  }, []);

  const [asyncState, setAsyncState] = useState<AsyncState<any>>({
    status: AsyncStatus.Init,
    refresh,
  });

  const { data, error } = asyncState;

  const httpClient = useAutoAbortedHttpClient(dependencies);

  useEffect(() => {
    const returnValue = fn({ http: httpClient });

    if (returnValue === undefined) {
      setAsyncState({
        status: AsyncStatus.Init,
        data: undefined,
        error: undefined,
        refresh,
      });
      return;
    }

    setAsyncState({
      status: AsyncStatus.Loading,
      data,
      error,
      refresh,
    });

    returnValue.then((nextData) => {
      setAsyncState({
        status: AsyncStatus.Settled,
        data: nextData,
        refresh,
      });
    });

    returnValue.catch((nextError) => {
      if (nextError instanceof AbortError) {
        return;
      }
      setAsyncState({
        status: AsyncStatus.Settled,
        error: nextError,
        refresh,
      });
      throw nextError;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [httpClient, refreshId, ...dependencies]);

  return asyncState;
};
