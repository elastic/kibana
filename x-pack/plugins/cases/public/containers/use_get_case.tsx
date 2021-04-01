/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useReducer, useCallback, useRef } from 'react';

import { Case } from './types';
import * as i18n from './translations';
import { useToasts } from '../common/lib/kibana';
import { getCase, getSubCase } from './api';

interface CaseState {
  data: Case | null;
  isLoading: boolean;
  isError: boolean;
}

type Action =
  | { type: 'FETCH_INIT' }
  | { type: 'FETCH_SUCCESS'; payload: Case }
  | { type: 'FETCH_FAILURE' }
  | { type: 'UPDATE_CASE'; payload: Case };

const dataFetchReducer = (state: CaseState, action: Action): CaseState => {
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
        data: action.payload,
      };
    case 'FETCH_FAILURE':
      return {
        ...state,
        isLoading: false,
        isError: true,
      };
    case 'UPDATE_CASE':
      return {
        ...state,
        data: action.payload,
      };
    default:
      return state;
  }
};

export interface UseGetCase extends CaseState {
  fetchCase: () => void;
  updateCase: (newCase: Case) => void;
}

export const useGetCase = (caseId: string, subCaseId?: string): UseGetCase => {
  const [state, dispatch] = useReducer(dataFetchReducer, {
    isLoading: false,
    isError: false,
    data: null,
  });
  const toasts = useToasts();
  const isCancelledRef = useRef(false);
  const abortCtrlRef = useRef(new AbortController());

  const updateCase = useCallback((newCase: Case) => {
    dispatch({ type: 'UPDATE_CASE', payload: newCase });
  }, []);

  const callFetch = useCallback(async () => {
    try {
      isCancelledRef.current = false;
      abortCtrlRef.current.abort();
      abortCtrlRef.current = new AbortController();
      dispatch({ type: 'FETCH_INIT' });

      const response = await (subCaseId
        ? getSubCase(caseId, subCaseId, true, abortCtrlRef.current.signal)
        : getCase(caseId, true, abortCtrlRef.current.signal));

      if (!isCancelledRef.current) {
        dispatch({ type: 'FETCH_SUCCESS', payload: response });
      }
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
  }, [caseId, subCaseId]);

  useEffect(() => {
    callFetch();

    return () => {
      isCancelledRef.current = true;
      abortCtrlRef.current.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId, subCaseId]);
  return { ...state, fetchCase: callFetch, updateCase };
};
