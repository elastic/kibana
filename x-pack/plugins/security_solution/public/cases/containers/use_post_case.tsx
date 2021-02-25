/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useReducer, useCallback, useRef, useEffect } from 'react';
import { AbortError } from '../../../../../../src/plugins/kibana_utils/common';
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
  const didCancel = useRef(false);
  const abortCtrl = useRef(new AbortController());

  const postMyCase = useCallback(async (data: CasePostRequest) => {
    try {
      didCancel.current = false;
      abortCtrl.current.abort();
      abortCtrl.current = new AbortController();

      dispatch({ type: 'FETCH_INIT' });
      const response = await postCase(data, abortCtrl.current.signal);

      if (!didCancel.current) {
        dispatch({ type: 'FETCH_SUCCESS' });
      }
      return response;
    } catch (error) {
      if (!didCancel.current) {
        if (!(error instanceof AbortError)) {
          errorToToaster({
            title: i18n.ERROR_TITLE,
            error: error.body && error.body.message ? new Error(error.body.message) : error,
            dispatchToaster,
          });
        }
        dispatch({ type: 'FETCH_FAILURE' });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      didCancel.current = true;
      abortCtrl.current.abort();
    };
  }, []);
  return { ...state, postCase: postMyCase };
};
