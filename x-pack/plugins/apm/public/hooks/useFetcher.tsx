/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useContext, useEffect, useState } from 'react';
import { GlobalFetchContext } from '../components/app/Main/GlobalFetchIndicator';

export enum FETCH_STATUS {
  LOADING = 'loading',
  SUCCESS = 'success',
  FAILURE = 'failure'
}

// use this in request methods to signal to `useFetch` that all arguments are not yet available
export class MissingArgumentsError extends Error {}

export function useFetcher<Response>(
  fn: () => Promise<Response>,
  useEffectKey: Array<string | boolean | number | undefined>
) {
  const { dispatchStatus } = useContext(GlobalFetchContext);
  const [result, setResult] = useState<{
    data?: Response;
    status?: FETCH_STATUS;
    error?: Error;
  }>({});

  useEffect(() => {
    let didCancel = false;
    let didFinish = false;

    // only apply the loading indicator if the promise did not resolve immediately
    // the promise will resolve immediately if the value was found in cache
    requestAnimationFrame(() => {
      if (!didFinish && !didCancel) {
        dispatchStatus({ name: fn.name, isLoading: true });
        setResult({
          data: result.data, // preserve data from previous state while loading next state
          status: FETCH_STATUS.LOADING,
          error: undefined
        });
      }
    });

    async function doFetch() {
      try {
        const data = await fn();
        if (!didCancel) {
          dispatchStatus({ name: fn.name, isLoading: false });
          setResult({
            data,
            status: FETCH_STATUS.SUCCESS,
            error: undefined
          });
        }
      } catch (e) {
        if (e instanceof MissingArgumentsError) {
          return;
        }
        if (!didCancel) {
          dispatchStatus({ name: fn.name, isLoading: false });
          setResult({
            data: undefined,
            status: FETCH_STATUS.FAILURE,
            error: e
          });
        }
      }
      didFinish = true;
    }

    doFetch();

    return () => {
      dispatchStatus({ name: fn.name, isLoading: false });
      didCancel = true;
    };
  }, useEffectKey);

  return result || {};
}
