/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  useEffect,
  useReducer,
  useRef,
  useState,
  Reducer,
  ReducerAction,
  ReducerState,
} from 'react';

import { useKibana } from '@kbn/kibana-react-plugin/public';

import { streamFetch } from './stream_fetch';

export interface UseStreamFetcherParams {
  endpoint: string;
  options: object;
  reducer: Reducer<any, any>;
}

export function useStreamFetchReducer<I extends UseStreamFetcherParams>(
  endpoint: I['endpoint'],
  reducer: I['reducer'],
  initialState: ReducerState<I['reducer']>,
  options: I['options']
) {
  const kibana = useKibana();

  const [isCancelled, setIsCancelled] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  const [data, dispatch] = useReducer(reducer, initialState);

  const abortCtrl = useRef(new AbortController());

  const start = async () => {
    if (isRunning) {
      throw new Error('Restart not supported yet');
    }

    setIsRunning(true);
    setIsCancelled(false);

    abortCtrl.current = new AbortController();

    for await (const actions of streamFetch<UseStreamFetcherParams>(
      endpoint,
      abortCtrl,
      options,
      kibana.services.http?.basePath.get(),
      typeof initialState !== 'string'
    )) {
      if (actions.length > 0) {
        dispatch(actions as ReducerAction<I['reducer']>);
      }
    }

    setIsRunning(false);
  };

  const cancel = () => {
    abortCtrl.current.abort();
    setIsCancelled(true);
    setIsRunning(false);
  };

  // If components using this custom hook get unmounted, cancel any ongoing request.
  useEffect(() => {
    return () => abortCtrl.current.abort();
  }, []);

  return {
    cancel,
    data,
    dispatch,
    isCancelled,
    isRunning,
    start,
  };
}
