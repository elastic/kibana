/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useReducer } from 'react';
import type { Reducer } from 'react';
import { useTrackHttpRequest } from '../../lib/apm/use_track_http_request';
import type { RequestName } from './request_names';

interface ResultState<Response, Error> {
  /**
   * The `data` will contain the raw response of the latest request executed.
   * It is initialized to `undefined`.
   */
  data?: Response;
  isLoading: boolean;
  /**
   * The `error` will contain the error of the latest request executed.
   * It is reset when a success response is completed.
   */
  error?: Error;
}

export interface Result<Parameters, Response, Error> extends ResultState<Response, Error> {
  /**
   * The `fetch` function starts a request with the parameters.
   * It aborts any previous pending request and starts a new request, every time it is called.
   * Optimizations are delegated to the consumer of the hook.
   */
  fetch: (parameters: Parameters) => void;
  /**
   * The `refetch` function restarts a request with the latest parameters used.
   * It aborts any previous pending request
   */
  refetch: () => void;
}

export type RequestFnParam<Parameters, Response> = (
  /**
   * The parameters that will be passed to the fetch function provided.
   */
  parameters: Parameters,
  /**
   * The abort signal. Call `signal.abort()` to abort the request.
   */
  signal: AbortController['signal']
) => Promise<Response>;

export interface OptionsParam<Parameters> {
  /**
   * Disables the fetching and aborts any pending request when is set to `true`.
   */
  disabled?: boolean;
  /**
   * Set `initialParameters` to start fetching immediately when the hook is called, without having to call the `fetch` function.
   */
  initialParameters?: Parameters;
}

interface State<Parameters, Response, Error> extends ResultState<Response, Error> {
  parameters?: Parameters;
}

type Action<Parameters, Response, Error> =
  | { type: 'FETCH_INIT'; payload: Parameters }
  | { type: 'FETCH_SUCCESS'; payload: Response }
  | { type: 'FETCH_FAILURE'; payload?: Error }
  | { type: 'FETCH_REPEAT' };

const requestReducer = <Parameters, Response, Error>(
  state: State<Parameters, Response, Error>,
  action: Action<Parameters, Response, Error>
): State<Parameters, Response, Error> => {
  switch (action.type) {
    case 'FETCH_INIT':
      return {
        ...state,
        parameters: action.payload,
        isLoading: true,
      };
    case 'FETCH_SUCCESS':
      return {
        ...state,
        data: action.payload,
        isLoading: false,
        error: undefined,
      };
    case 'FETCH_FAILURE':
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      };
    case 'FETCH_REPEAT':
      return {
        ...state,
        isLoading: true,
      };
    default:
      return state;
  }
};

/**
 * `useFetch` is a generic hook that simplifies the async request queries implementation.
 *  It provides: APM monitoring, abort control, error handling and refetching.
 * @param requestName The unique name of the request. It is used for APM tracking, it should be descriptive.
 * @param fetchFn The function provided to execute the fetch request. It should accept the request `parameters` and the abort `signal`.
 * @param options Additional options.
 */
export const useFetch = <Parameters, Response, Error extends unknown>(
  requestName: RequestName,
  fetchFn: RequestFnParam<Parameters, Response>,
  { disabled = false, initialParameters }: OptionsParam<Parameters> = {}
): Result<Parameters, Response, Error> => {
  const { startTracking } = useTrackHttpRequest();

  const [{ parameters, data, isLoading, error }, dispatch] = useReducer<
    Reducer<State<Parameters, Response, Error>, Action<Parameters, Response, Error>>
  >(requestReducer, {
    data: undefined,
    isLoading: !disabled && initialParameters !== undefined, // isLoading state is used internally to control fetch executions
    error: undefined,
    parameters: initialParameters,
  });

  const fetch = useCallback(
    (param: Parameters) => dispatch({ type: 'FETCH_INIT', payload: param }),
    []
  );
  const refetch = useCallback(() => dispatch({ type: 'FETCH_REPEAT' }), []);

  useEffect(() => {
    if (isLoading === false || parameters === undefined || disabled) {
      return;
    }

    let ignore = false;
    const abortController = new AbortController();

    const executeFetch = async () => {
      const { endTracking } = startTracking({ name: requestName });
      try {
        const response = await fetchFn(parameters, abortController.signal);
        endTracking('success');
        if (!ignore) {
          dispatch({ type: 'FETCH_SUCCESS', payload: response });
        }
      } catch (err) {
        endTracking(abortController.signal.aborted ? 'aborted' : 'error');
        if (!ignore) {
          dispatch({ type: 'FETCH_FAILURE', payload: err });
        }
      }
    };

    executeFetch();

    return () => {
      ignore = true;
      abortController.abort();
    };
  }, [isLoading, parameters, disabled, fetchFn, startTracking, requestName]);

  return { fetch, refetch, data, isLoading, error };
};
