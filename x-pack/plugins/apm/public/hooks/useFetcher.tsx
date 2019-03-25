/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useContext, useEffect, useState } from 'react';
import { FetchStatusContext } from '../components/app/Main/FetchStatus';

export enum FETCH_STATUS {
  LOADING = 'loading',
  SUCCESS = 'success',
  FAILURE = 'failure'
}

// use this in request methods to signal to `useFetch` that all arguments are not yet available
export class MissingArgumentsError extends Error {}

export function useFetcher<Opts, Response>(
  fn: (fnOptions: Opts) => Promise<Response>,
  fnOptions: Opts
) {
  const { dispatchStatus } = useContext(FetchStatusContext);
  const [result, setResult] = useState<{
    data?: Response;
    status?: FETCH_STATUS;
    error?: Error;
  }>({});

  const useEffectKey = [...Object.keys(fnOptions), ...Object.values(fnOptions)];

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

    fn(fnOptions)
      .then(data => {
        didFinish = true;
        if (!didCancel) {
          dispatchStatus({ name: fn.name, isLoading: false });
          setResult({
            data,
            status: FETCH_STATUS.SUCCESS,
            error: undefined
          });
        }
      })
      .catch(e => {
        didFinish = true;
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
      });

    return () => {
      dispatchStatus({ name: fn.name, isLoading: false });
      didCancel = true;
    };
  }, useEffectKey);

  return result || {};
}
