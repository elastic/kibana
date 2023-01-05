/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import deepEqual from 'fast-deep-equal';
import { Reducer, useEffect, useReducer, useRef } from 'react';
import { useKibana } from '../../common/lib/kibana';
import { executeAction } from '../lib/action_connector_api';

export interface UseSubActionParams<P> {
  connectorId?: string;
  subAction?: string;
  subActionParams?: P;
  disabled?: boolean;
}

interface SubActionsState<R> {
  isLoading: boolean;
  response: R | undefined;
  error: Error | null;
}

enum SubActionsActionsList {
  START,
  STOP,
  SUCCESS,
  ERROR,
}

type Action<R> =
  | { type: SubActionsActionsList.START }
  | { type: SubActionsActionsList.STOP }
  | { type: SubActionsActionsList.SUCCESS; payload: R | undefined }
  | { type: SubActionsActionsList.ERROR; payload: Error | null };

const dataFetchReducer = <R,>(state: SubActionsState<R>, action: Action<R>): SubActionsState<R> => {
  switch (action.type) {
    case SubActionsActionsList.START:
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case SubActionsActionsList.STOP:
      return {
        ...state,
        isLoading: false,
        error: null,
      };
    case SubActionsActionsList.SUCCESS:
      return {
        ...state,
        response: action.payload,
        isLoading: false,
        error: null,
      };
    case SubActionsActionsList.ERROR:
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      };
    default:
      return state;
  }
};

const useMemoParams = <P,>(subActionsParams: P): P => {
  const paramsRef = useRef<P>(subActionsParams);
  if (!deepEqual(paramsRef.current, subActionsParams)) {
    paramsRef.current = subActionsParams;
  }
  return paramsRef.current;
};

export const useSubAction = <P, R>({
  connectorId,
  subAction,
  subActionParams,
  disabled = false,
}: UseSubActionParams<P>) => {
  const { http } = useKibana().services;
  const [{ isLoading, response, error }, dispatch] = useReducer<
    Reducer<SubActionsState<R>, Action<R>>
  >(dataFetchReducer, {
    isLoading: false,
    response: undefined,
    error: null,
  });
  const memoParams = useMemoParams(subActionParams);

  useEffect(() => {
    if (disabled || !connectorId || !subAction) {
      dispatch({ type: SubActionsActionsList.STOP });
      return;
    }

    const abortCtrl = new AbortController();
    let isActive = true;

    const executeSubAction = async () => {
      try {
        dispatch({ type: SubActionsActionsList.START });

        const res = await executeAction<R>({
          id: connectorId,
          params: {
            subAction,
            subActionParams: memoParams,
          },
          http,
          signal: abortCtrl.signal,
        });

        if (isActive) {
          if (res.status && res.status === 'ok') {
            dispatch({ type: SubActionsActionsList.SUCCESS, payload: res.data });
          } else {
            dispatch({
              type: SubActionsActionsList.ERROR,
              payload: new Error(`${res.message}: ${res.serviceMessage}`),
            });
          }
        }
        return res.data;
      } catch (err) {
        if (isActive) {
          dispatch({
            type: SubActionsActionsList.ERROR,
            payload: err,
          });
        }
      }
    };

    executeSubAction();

    return () => {
      isActive = false;
      abortCtrl.abort();
    };
  }, [memoParams, disabled, connectorId, subAction, http]);

  return { isLoading, response, error };
};
