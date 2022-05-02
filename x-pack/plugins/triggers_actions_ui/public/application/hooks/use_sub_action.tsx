/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useReducer, useRef } from 'react';
import { ActionTypeExecutorResult } from '@kbn/actions-plugin/common';
import { useKibana } from '../../common/lib/kibana';
import { executeAction } from '../lib/action_connector_api';

interface UseSubActionParams {
  connectorId: string;
  subAction: string;
  subActionParams: Record<string, unknown>;
}

interface SubActionsState<T> {
  isLoading: boolean;
  isError: boolean;
  response: unknown | undefined;
  error: Error | null;
}

enum SubActionsActionsList {
  INIT,
  LOADING,
  SUCCESS,
  ERROR,
}

type Action<T> =
  | { type: SubActionsActionsList.INIT }
  | { type: SubActionsActionsList.LOADING }
  | { type: SubActionsActionsList.SUCCESS; payload: T | undefined }
  | { type: SubActionsActionsList.ERROR; payload: Error | null };

const dataFetchReducer = <T,>(state: SubActionsState<T>, action: Action<T>): SubActionsState<T> => {
  switch (action.type) {
    case SubActionsActionsList.INIT:
      return {
        ...state,
        isLoading: false,
        isError: false,
      };

    case SubActionsActionsList.LOADING:
      return {
        ...state,
        isLoading: true,
        isError: false,
      };

    case SubActionsActionsList.SUCCESS:
      return {
        ...state,
        response: action.payload,
        isLoading: false,
        isError: false,
      };

    case SubActionsActionsList.ERROR:
      return {
        ...state,
        error: action.payload,
        isLoading: false,
        isError: true,
      };

    default:
      return state;
  }
};

export const useSubAction = <T,>(params: UseSubActionParams | null) => {
  const { http } = useKibana().services;
  const [state, dispatch] = useReducer(dataFetchReducer, {
    isError: false,
    isLoading: false,
    response: undefined,
    error: null,
  });

  const abortCtrl = useRef(new AbortController());
  const isMounted = useRef(false);

  async function executeSubAction() {
    if (params == null) {
      return;
    }

    const { connectorId, subAction, subActionParams } = params;
    dispatch({ type: SubActionsActionsList.INIT });

    try {
      abortCtrl.current.abort();
      abortCtrl.current = new AbortController();
      dispatch({ type: SubActionsActionsList.LOADING });

      const res = (await executeAction({
        id: connectorId,
        http,
        params: {
          subAction,
          subActionParams,
        },
      })) as ActionTypeExecutorResult<T>;

      if (isMounted.current) {
        if (res.status && res.status === 'error') {
          dispatch({
            type: SubActionsActionsList.ERROR,
            payload: new Error(`${res.message}: ${res.serviceMessage}`),
          });
        }

        dispatch({ type: SubActionsActionsList.SUCCESS, payload: res.data });
      }

      return res.data;
    } catch (e) {
      if (isMounted.current) {
        dispatch({
          type: SubActionsActionsList.ERROR,
          payload: e,
        });
      }
    }
  }

  useEffect(() => {
    isMounted.current = true;
    executeSubAction();
    return () => {
      isMounted.current = false;
      abortCtrl.current.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    ...state,
  };
};
