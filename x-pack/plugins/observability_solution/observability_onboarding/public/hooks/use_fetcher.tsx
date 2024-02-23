/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { useEffect, useMemo, useState } from 'react';
import type {
  IHttpFetchError,
  ResponseErrorBody,
} from '@kbn/core-http-browser';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useInspectorContext } from '@kbn/observability-shared-plugin/public';
import {
  AutoAbortedObservabilityClient,
  callObservabilityOnboardingApi,
} from '../services/rest/create_call_api';

export enum FETCH_STATUS {
  LOADING = 'loading',
  SUCCESS = 'success',
  FAILURE = 'failure',
  NOT_INITIATED = 'not_initiated',
}

export const isPending = (fetchStatus: FETCH_STATUS) =>
  fetchStatus === FETCH_STATUS.LOADING ||
  fetchStatus === FETCH_STATUS.NOT_INITIATED;

export interface FetcherResult<Data> {
  data?: Data;
  status: FETCH_STATUS;
  error?: IHttpFetchError<ResponseErrorBody>;
}

function getDetailsFromErrorResponse(
  error: IHttpFetchError<ResponseErrorBody>
) {
  const message = error.body?.message ?? error.response?.statusText;
  return (
    <>
      {message} ({error.response?.status})
      <h5>
        {i18n.translate('xpack.observability_onboarding.fetcher.error.url', {
          defaultMessage: `URL`,
        })}
      </h5>
      {error.response?.url}
    </>
  );
}

const createAutoAbortedClient = (
  signal: AbortSignal,
  addInspectorRequest: <Data>(result: FetcherResult<Data>) => void
): AutoAbortedObservabilityClient => {
  return ((endpoint, options) => {
    return callObservabilityOnboardingApi(endpoint, {
      ...options,
      signal,
    } as any)
      .catch((err) => {
        addInspectorRequest({
          status: FETCH_STATUS.FAILURE,
          data: err.body?.attributes,
        });
        throw err;
      })
      .then((response) => {
        addInspectorRequest({
          data: response,
          status: FETCH_STATUS.SUCCESS,
        });
        return response;
      });
  }) as AutoAbortedObservabilityClient;
};

// fetcher functions can return undefined OR a promise. Previously we had a more simple type
// but it led to issues when using object destructuring with default values
type InferResponseType<TReturn> = Exclude<TReturn, undefined> extends Promise<
  infer TResponseType
>
  ? TResponseType
  : unknown;

export function useFetcher<TReturn>(
  fn: (callApi: AutoAbortedObservabilityClient) => TReturn,
  fnDeps: any[],
  options: {
    preservePreviousData?: boolean;
    showToastOnError?: boolean;
  } = {}
): FetcherResult<InferResponseType<TReturn>> & { refetch: () => void } {
  const { notifications } = useKibana();
  const { preservePreviousData = true, showToastOnError = true } = options;
  const [result, setResult] = useState<
    FetcherResult<InferResponseType<TReturn>>
  >({
    data: undefined,
    status: FETCH_STATUS.NOT_INITIATED,
  });
  const [counter, setCounter] = useState(0);
  const { addInspectorRequest } = useInspectorContext();

  useEffect(() => {
    let controller: AbortController = new AbortController();

    async function doFetch() {
      controller.abort();

      controller = new AbortController();

      const signal = controller.signal;

      const promise = fn(createAutoAbortedClient(signal, addInspectorRequest));
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
        const err = e as Error | IHttpFetchError<ResponseErrorBody>;

        if (!signal.aborted) {
          const errorDetails =
            'response' in err ? getDetailsFromErrorResponse(err) : err.message;

          if (showToastOnError) {
            notifications.toasts.danger({
              title: i18n.translate(
                'xpack.observability_onboarding.fetcher.error.title',
                {
                  defaultMessage: `Error while fetching resource`,
                }
              ),

              body: (
                <div>
                  <h5>
                    {i18n.translate(
                      'xpack.observability_onboarding.fetcher.error.status',
                      {
                        defaultMessage: `Error`,
                      }
                    )}
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
