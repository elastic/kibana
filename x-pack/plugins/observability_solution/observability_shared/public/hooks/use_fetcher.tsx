/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState, useMemo } from 'react';

export enum FETCH_STATUS {
  LOADING = 'loading',
  SUCCESS = 'success',
  FAILURE = 'failure',
  PENDING = 'pending',
  NOT_INITIATED = 'not_initiated',
}

export interface FetcherResult<Data> {
  data?: Data;
  status: FETCH_STATUS;
  error?: Error;
  loading?: boolean;
}

// fetcher functions can return undefined OR a promise. Previously we had a more simple type
// but it led to issues when using object destructuring with default values
type InferResponseType<TReturn> = Exclude<TReturn, undefined> extends Promise<infer TResponseType>
  ? TResponseType
  : unknown;

export function useFetcher<TReturn>(
  fn: ({}: { signal: AbortSignal }) => TReturn,
  fnDeps: any[],
  options: {
    preservePreviousData?: boolean;
  } = {}
): FetcherResult<InferResponseType<TReturn>> & { refetch: () => void } {
  const { preservePreviousData = true } = options;

  const [result, setResult] = useState<FetcherResult<InferResponseType<TReturn>>>({
    data: undefined,
    status: FETCH_STATUS.PENDING,
    loading: true,
  });
  const [counter, setCounter] = useState(0);
  useEffect(() => {
    let controller: AbortController = new AbortController();

    async function doFetch() {
      controller.abort();

      controller = new AbortController();

      const signal = controller.signal;

      const promise = fn({ signal });
      if (!promise) {
        setResult((prevResult) => ({
          ...prevResult,
          status: FETCH_STATUS.NOT_INITIATED,
        }));
        return;
      }

      setResult((prevResult) => ({
        data: preservePreviousData ? prevResult.data : undefined,
        status: FETCH_STATUS.LOADING,
        error: undefined,
        loading: true,
      }));

      try {
        const data = await promise;
        // when http fetches are aborted, the promise will be rejected
        // and this code is never reached. For async operations that are
        // not cancellable, we need to check whether the signal was
        // aborted before updating the result.
        if (!signal.aborted) {
          setResult({
            data,
            loading: false,
            status: FETCH_STATUS.SUCCESS,
            error: undefined,
          } as FetcherResult<InferResponseType<TReturn>>);
        }
      } catch (e) {
        if (!signal.aborted) {
          setResult((prevResult) => ({
            data: preservePreviousData ? prevResult.data : undefined,
            status: FETCH_STATUS.FAILURE,
            error: e,
            loading: false,
          }));
        }
      }
    }

    doFetch();

    return () => {
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [counter, ...fnDeps]);

  return useMemo(() => {
    return {
      ...result,
      loading: result.status === FETCH_STATUS.LOADING || result.status === FETCH_STATUS.PENDING,
      refetch: () => {
        // this will invalidate the deps to `useEffect` and will result in a new request
        setCounter((count) => count + 1);
      },
    };
  }, [result]);
}
