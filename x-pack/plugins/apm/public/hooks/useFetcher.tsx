/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useState } from 'react';

export enum FETCH_STATUS {
  LOADING = 'loading',
  SUCCESS = 'success',
  FAILURE = 'failure'
}

// use this in request methods to signal to `useFetch` that all arguments are not yet available
export class MissingArgumentsError extends Error {}

export function useFetcher<Opts, Response>(
  fn: (options: Opts) => Promise<Response>,
  options: Opts
) {
  const [result, setResult] = useState<{
    data?: Response;
    status?: FETCH_STATUS;
    error?: Error;
  }>({});

  useEffect(
    () => {
      let didCancel = false;

      setResult({
        data: result.data, // preserve data from previous state while loading next state
        status: FETCH_STATUS.LOADING,
        error: undefined
      });

      fn(options)
        .then(data => {
          if (!didCancel) {
            setResult({
              data,
              status: FETCH_STATUS.SUCCESS,
              error: undefined
            });
          }
        })
        .catch(e => {
          if (e instanceof MissingArgumentsError) {
            return;
          }
          if (!didCancel) {
            setResult({
              data: undefined,
              status: FETCH_STATUS.FAILURE,
              error: e
            });
          }
        });

      return () => {
        didCancel = true;
      };
    },
    [...Object.keys(options), ...Object.values(options)]
  );

  return result;
}
