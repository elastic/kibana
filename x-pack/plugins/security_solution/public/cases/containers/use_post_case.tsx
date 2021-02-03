/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { useReducer, useCallback, useRef, useEffect } from 'react';
import { CasePostRequest } from '../../../../case/common/api';
import { errorToToaster, useStateToaster } from '../../common/components/toasters';
import { postCase } from './api';
import * as i18n from './translations';
import { Case } from './types';
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
  const [, dispatchToaster] = useStateToaster();
  const cancel = useRef(false);
  const abortCtrl = useRef(new AbortController());
  const postMyCase = useCallback(
    async (data: CasePostRequest) => {
      try {
        dispatch({ type: 'FETCH_INIT' });
        abortCtrl.current.abort();
        cancel.current = false;
        abortCtrl.current = new AbortController();
        const response = await postCase(data, abortCtrl.current.signal);
        if (!cancel.current) {
          dispatch({ type: 'FETCH_SUCCESS' });
        }
        return response;
      } catch (error) {
        if (!cancel.current) {
          errorToToaster({
            title: i18n.ERROR_TITLE,
            error: error.body && error.body.message ? new Error(error.body.message) : error,
            dispatchToaster,
          });
          dispatch({ type: 'FETCH_FAILURE' });
        }
      }
    },
    [dispatchToaster]
  );
  useEffect(() => {
    return () => {
      abortCtrl.current.abort();
      cancel.current = true;
    };
  }, []);
  return { ...state, postCase: postMyCase };
};
