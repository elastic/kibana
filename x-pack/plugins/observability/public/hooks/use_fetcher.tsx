/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useState, useMemo } from 'react';

export enum FETCH_STATUS {
  LOADING = 'loading',
  SUCCESS = 'success',
  FAILURE = 'failure',
  PENDING = 'pending',
}

export interface FetcherResult<Data> {
  data?: Data;
  status: FETCH_STATUS;
  error?: Error;
}

// fetcher functions can return undefined OR a promise. Previously we had a more simple type
// but it led to issues when using object destructuring with default values
type InferResponseType<TReturn> = Exclude<TReturn, undefined> extends Promise<infer TResponseType>
  ? TResponseType
  : unknown;

export function useFetcher<TReturn>(
  fn: () => TReturn,
  fnDeps: any[],
  options: {
    preservePreviousData?: boolean;
  } = {}
): FetcherResult<InferResponseType<TReturn>> & { refetch: () => void } {
  const { preservePreviousData = true } = options;

  const [result, setResult] = useState<FetcherResult<InferResponseType<TReturn>>>({
    data: undefined,
    status: FETCH_STATUS.PENDING,
  });
  const [counter, setCounter] = useState(0);
  useEffect(() => {
    async function doFetch() {
      const promise = fn();
      if (!promise) {
        return;
      }

      setResult((prevResult) => ({
        data: preservePreviousData ? prevResult.data : undefined,
        status: FETCH_STATUS.LOADING,
        error: undefined,
      }));

      try {
        const data = await promise;
        setResult({
          data,
          status: FETCH_STATUS.SUCCESS,
          error: undefined,
        } as FetcherResult<InferResponseType<TReturn>>);
      } catch (e) {
        setResult((prevResult) => ({
          data: preservePreviousData ? prevResult.data : undefined,
          status: FETCH_STATUS.FAILURE,
          error: e,
        }));
      }
    }

    doFetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [counter, ...fnDeps]);

  return useMemo(() => {
    return {
      ...result,
      refetch: () => {
        // this will invalidate the deps to `useEffect` and will result in a new request
        setCounter((count) => count + 1);
      },
    };
  }, [result]);
}
