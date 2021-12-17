/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useReducer, useCallback, useRef, useEffect } from 'react';
import { CasePostRequest } from '../../common/api';
import { postCase } from './api';
import * as i18n from './translations';
import { Case } from './types';
import { useToasts } from '../common/lib/kibana';
interface NewCaseState {
  isLoading: boolean;
  isError: boolean;
}
type Action = { type: 'FETCH_INIT' } | { type: 'FETCH_SUCCESS' } | { type: 'FETCH_FAILURE' };

const dataFetchReducer = (state: NewCaseState, action: Action): NewCaseState => {
  switch (action.type) {
    case 'FETCH_INIT':
      return {
        ...state,
        isLoading: true,
        isError: false,
      };
    case 'FETCH_SUCCESS':
      return {
        ...state,
        isLoading: false,
        isError: false,
      };
    case 'FETCH_FAILURE':
      return {
        ...state,
        isLoading: false,
        isError: true,
      };
    default:
      return state;
  }
};
export interface UsePostCase extends NewCaseState {
  postCase: (data: CasePostRequest) => Promise<Case | undefined>;
}
export const usePostCase = (): UsePostCase => {
  const [state, dispatch] = useReducer(dataFetchReducer, {
    isLoading: false,
    isError: false,
  });
  const toasts = useToasts();
  const isCancelledRef = useRef(false);
  const abortCtrlRef = useRef(new AbortController());

  const postMyCase = useCallback(async (data: CasePostRequest) => {
    try {
      isCancelledRef.current = false;
      abortCtrlRef.current.abort();
      abortCtrlRef.current = new AbortController();

      dispatch({ type: 'FETCH_INIT' });
      const response = await postCase(data, abortCtrlRef.current.signal);

      if (!isCancelledRef.current) {
        dispatch({ type: 'FETCH_SUCCESS' });
      }
      return response;
    } catch (error) {
      if (!isCancelledRef.current) {
        if (error.name !== 'AbortError') {
          toasts.addError(
            error.body && error.body.message ? new Error(error.body.message) : error,
            { title: i18n.ERROR_TITLE }
          );
        }
        dispatch({ type: 'FETCH_FAILURE' });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(
    () => () => {
      isCancelledRef.current = true;
      abortCtrlRef.current.abort();
    },
    []
  );
  return { ...state, postCase: postMyCase };
};
