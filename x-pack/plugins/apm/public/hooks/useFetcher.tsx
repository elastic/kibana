/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useContext, useEffect, useState } from 'react';
import { LoadingIndicatorContext } from '../context/LoadingIndicatorContext';
import { useComponentId } from './useComponentId';

export enum FETCH_STATUS {
  LOADING = 'loading',
  SUCCESS = 'success',
  FAILURE = 'failure'
}

export function useFetcher<Response>(
  fn: () => Promise<Response> | undefined,
  useEffectKey: any[]
) {
  const id = useComponentId();
  const { dispatchStatus } = useContext(LoadingIndicatorContext);
  const [result, setResult] = useState<{
    data?: Response;
    status?: FETCH_STATUS;
    error?: Error;
  }>({});

  useEffect(() => {
    let didCancel = false;

    dispatchStatus({ id, isLoading: true });
    setResult({
      data: result.data, // preserve data from previous state while loading next state
      status: FETCH_STATUS.LOADING,
      error: undefined
    });

    async function doFetch() {
      try {
        const data = await fn();
        if (!didCancel) {
          dispatchStatus({ id, isLoading: false });
          setResult({
            data,
            status: FETCH_STATUS.SUCCESS,
            error: undefined
          });
        }
      } catch (e) {
        if (!didCancel) {
          dispatchStatus({ id, isLoading: false });
          setResult({
            data: undefined,
            status: FETCH_STATUS.FAILURE,
            error: e
          });
        }
      }
    }

    doFetch();

    return () => {
      dispatchStatus({ id, isLoading: false });
      didCancel = true;
    };
  }, useEffectKey);

  return result || {};
}
