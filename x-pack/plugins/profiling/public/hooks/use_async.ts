/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { HttpStart } from '@kbn/core-http-browser';
import { useEffect, useState } from 'react';
import { useProfilingDependencies } from '../components/contexts/profiling_dependencies/use_profiling_dependencies';

export enum AsyncStatus {
  Loading = 'loading',
  Init = 'init',
  Settled = 'settled',
}

export interface AsyncState<T> {
  data?: T;
  error?: Error;
  status: AsyncStatus;
}

export type UseAsync = <T>(
  fn: ({ http }: { http: HttpStart }) => Promise<T> | undefined,
  dependencies: any[]
) => AsyncState<T>;

export const useAsync: UseAsync = (fn, dependencies) => {
  const {
    start: {
      core: { http },
    },
  } = useProfilingDependencies();
  const [asyncState, setAsyncState] = useState<AsyncState<any>>({
    status: AsyncStatus.Init,
  });

  const { data, error } = asyncState;

  useEffect(() => {
    const returnValue = fn({ http });

    if (returnValue === undefined) {
      setAsyncState({
        status: AsyncStatus.Init,
        data: undefined,
        error: undefined,
      });
      return;
    }

    setAsyncState({
      status: AsyncStatus.Loading,
      data,
      error,
    });

    returnValue.then((nextData) => {
      setAsyncState({
        status: AsyncStatus.Settled,
        data: nextData,
      });
    });

    returnValue.catch((nextError) => {
      setAsyncState({
        status: AsyncStatus.Settled,
        error: nextError,
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [http, ...dependencies]);

  return asyncState;
};
