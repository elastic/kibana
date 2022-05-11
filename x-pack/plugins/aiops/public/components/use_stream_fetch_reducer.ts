/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useReducer, useRef, useState, Reducer, ReducerAction, ReducerState } from 'react';

import { useKibana } from '@kbn/kibana-react-plugin/public';

import type { ApiEndpoint, ApiEndpointOptions } from '../../common/api';

import { streamFetch } from './stream_fetch';

export const useStreamFetchReducer = <R extends Reducer<any, any>, E = ApiEndpoint>(
  endpoint: E,
  reducer: R,
  initialState: ReducerState<R>,
  options: ApiEndpointOptions[ApiEndpoint]
) => {
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

    for await (const actions of streamFetch(
      endpoint,
      abortCtrl,
      options,
      kibana.services.http?.basePath.get()
    )) {
      dispatch(actions as ReducerAction<R>);
    }

    setIsRunning(false);
  };

  const cancel = () => {
    abortCtrl.current.abort();
    setIsCancelled(true);
    setIsRunning(false);
  };

  return {
    cancel,
    data,
    dispatch,
    isCancelled,
    isRunning,
    start,
  };
};
