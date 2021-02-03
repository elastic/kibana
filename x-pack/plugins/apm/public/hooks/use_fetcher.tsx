/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React, { useEffect, useMemo, useState } from 'react';
import { IHttpFetchError } from 'src/core/public';
import { toMountPoint } from '../../../../../src/plugins/kibana_react/public';
import {
  callApmApi,
  AutoAbortedAPMClient,
} from '../services/rest/createCallApmApi';
import { useApmPluginContext } from '../context/apm_plugin/use_apm_plugin_context';
import { useUrlParams } from '../context/url_params_context/use_url_params';

export enum FETCH_STATUS {
  LOADING = 'loading',
  SUCCESS = 'success',
  FAILURE = 'failure',
  NOT_INITIATED = 'not_initiated',
}

export interface FetcherResult<Data> {
  data?: Data;
  status: FETCH_STATUS;
  error?: IHttpFetchError;
}

function getDetailsFromErrorResponse(error: IHttpFetchError) {
  const message = error.body?.message ?? error.response?.statusText;
  return (
    <>
      {message} ({error.response?.status})
      <h5>
        {i18n.translate('xpack.apm.fetcher.error.url', {
          defaultMessage: `URL`,
        })}
      </h5>
      {error.response?.url}
    </>
  );
}

const createAutoAbortedAPMClient = (
  signal: AbortSignal
): AutoAbortedAPMClient => {
  return ((options: Parameters<AutoAbortedAPMClient>[0]) => {
    return callApmApi({ ...options, signal });
  }) as AutoAbortedAPMClient;
};

// fetcher functions can return undefined OR a promise. Previously we had a more simple type
// but it led to issues when using object destructuring with default values
type InferResponseType<TReturn> = Exclude<TReturn, undefined> extends Promise<
  infer TResponseType
>
  ? TResponseType
  : unknown;

export function useFetcher<TReturn>(
  fn: (callApmApi: AutoAbortedAPMClient) => TReturn,
  fnDeps: any[],
  options: {
    preservePreviousData?: boolean;
    showToastOnError?: boolean;
  } = {}
): FetcherResult<InferResponseType<TReturn>> & { refetch: () => void } {
  const { notifications } = useApmPluginContext().core;
  const { preservePreviousData = true, showToastOnError = true } = options;
  const [result, setResult] = useState<
    FetcherResult<InferResponseType<TReturn>>
  >({
    data: undefined,
    status: FETCH_STATUS.NOT_INITIATED,
  });
  const [counter, setCounter] = useState(0);
  const { rangeId } = useUrlParams();

  useEffect(() => {
    let controller: AbortController = new AbortController();

    async function doFetch() {
      controller.abort();

      controller = new AbortController();

      const signal = controller.signal;

      const promise = fn(createAutoAbortedAPMClient(signal));
      // if `fn` doesn't return a promise it is a signal that data fetching was not initiated.
      // This can happen if the data fetching is conditional (based on certain inputs).
      // In these cases it is not desirable to invoke the global loading spinner, or change the status to success
      if (!promise) {
        return;
      }

      setResult((prevResult) => ({
        data: preservePreviousData ? prevResult.data : undefined, // preserve data from previous state while loading next state
        status: FETCH_STATUS.LOADING,
        error: undefined,
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
            status: FETCH_STATUS.SUCCESS,
            error: undefined,
          } as FetcherResult<InferResponseType<TReturn>>);
        }
      } catch (e) {
        const err = e as Error | IHttpFetchError;

        if (!signal.aborted) {
          const errorDetails =
            'response' in err ? getDetailsFromErrorResponse(err) : err.message;

          if (showToastOnError) {
            notifications.toasts.addDanger({
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
      controller.abort();
    };
    /* eslint-disable react-hooks/exhaustive-deps */
  }, [
    counter,
    preservePreviousData,
    rangeId,
    showToastOnError,
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
