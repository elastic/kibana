/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable no-console */

import React, { useContext, useEffect, useState, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { IHttpFetchError } from 'src/core/public';
import { toMountPoint } from '../../../../../src/plugins/kibana_react/public';
import { LoadingIndicatorContext } from '../context/LoadingIndicatorContext';
import { APMClient, callApmApi } from '../services/rest/createCallApmApi';
import { useApmPluginContext } from './useApmPluginContext';
import { useLoadingIndicator } from './useLoadingIndicator';

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
type InferResponseType<TReturn> = Exclude<TReturn, undefined> extends Promise<
  infer TResponseType
>
  ? TResponseType
  : unknown;

export function useFetcher<TReturn>(
  fn: (callApmApi: APMClient) => TReturn,
  fnDeps: any[],
  options: {
    preservePreviousData?: boolean;
    showToastOnError?: boolean;
  } = {}
): FetcherResult<InferResponseType<TReturn>> & { refetch: () => void } {
  const { notifications } = useApmPluginContext().core;
  const { preservePreviousData = true, showToastOnError = true } = options;
  const { setIsLoading } = useLoadingIndicator();

  const { dispatchStatus } = useContext(LoadingIndicatorContext);
  const [result, setResult] = useState<
    FetcherResult<InferResponseType<TReturn>>
  >({
    data: undefined,
    status: FETCH_STATUS.PENDING,
  });
  const [counter, setCounter] = useState(0);

  useEffect(() => {
    let didCancel = false;

    async function doFetch() {
      const promise = fn(callApmApi);
      // if `fn` doesn't return a promise it is a signal that data fetching was not initiated.
      // This can happen if the data fetching is conditional (based on certain inputs).
      // In these cases it is not desirable to invoke the global loading spinner, or change the status to success
      if (!promise) {
        return;
      }

      setIsLoading(true);

      setResult((prevResult) => ({
        data: preservePreviousData ? prevResult.data : undefined, // preserve data from previous state while loading next state
        status: FETCH_STATUS.LOADING,
        error: undefined,
      }));

      try {
        const data = await promise;
        if (!didCancel) {
          setIsLoading(false);
          setResult({
            data,
            status: FETCH_STATUS.SUCCESS,
            error: undefined,
          } as FetcherResult<InferResponseType<TReturn>>);
        }
      } catch (e) {
        const err = e as Error | IHttpFetchError;

        if (!didCancel) {
          const errorDetails =
            'response' in err ? (
              <>
                {err.response?.statusText} ({err.response?.status})
                <h5>
                  {i18n.translate('xpack.apm.fetcher.error.url', {
                    defaultMessage: `URL`,
                  })}
                </h5>
                {err.response?.url}
              </>
            ) : (
              err.message
            );

          if (showToastOnError) {
            notifications.toasts.addWarning({
              title: i18n.translate('xpack.apm.fetcher.error.title', {
                defaultMessage: `Error while fetching resource`,
              }),
              text: toMountPoint(
                <div>
                  <h5>
                    {i18n.translate('xpack.apm.fetcher.error.status', {
                      defaultMessage: `Error`,
                    })}
                  </h5>

                  {errorDetails}
                </div>
              ),
            });
          }
          setIsLoading(false);
          setResult({
            data: undefined,
            status: FETCH_STATUS.FAILURE,
            error: e,
          });
        }
      }
    }

    doFetch();

    return () => {
      setIsLoading(false);
      didCancel = true;
    };
    /* eslint-disable react-hooks/exhaustive-deps */
  }, [
    counter,
    preservePreviousData,
    showToastOnError,
    dispatchStatus,
    setIsLoading,
    ...fnDeps,
    /* eslint-enable react-hooks/exhaustive-deps */
  ]);

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
