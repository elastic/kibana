/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useReducer, useCallback, useRef } from 'react';

import { Case, ResolvedCase } from './types';
import * as i18n from './translations';
import { useToasts } from '../common/lib/kibana';
import { resolveCase } from './api';

interface CaseState {
  data: Case | null;
  resolveOutcome: ResolvedCase['outcome'] | null;
  resolveAliasId?: ResolvedCase['aliasTargetId'];
  resolveAliasPurpose?: ResolvedCase['aliasPurpose'];
  isLoading: boolean;
  isError: boolean;
}

type Action =
  | { type: 'FETCH_INIT'; payload: { silent: boolean } }
  | { type: 'FETCH_SUCCESS'; payload: ResolvedCase }
  | { type: 'FETCH_FAILURE' }
  | { type: 'UPDATE_CASE'; payload: Case };

const dataFetchReducer = (state: CaseState, action: Action): CaseState => {
  switch (action.type) {
    case 'FETCH_INIT':
      return {
        ...state,
        // If doing a silent fetch, then don't set `isLoading`. This helps
        // with preventing screen flashing when wanting to refresh the actions
        // and comments
        isLoading: !action.payload?.silent,
        isError: false,
      };
    case 'FETCH_SUCCESS':
      return {
        ...state,
        isLoading: false,
        isError: false,
        data: action.payload.case,
        resolveOutcome: action.payload.outcome,
        resolveAliasId: action.payload.aliasTargetId,
        resolveAliasPurpose: action.payload.aliasPurpose,
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
  /**
   * @param [silent] When set to `true`, the `isLoading` property will not be set to `true`
   * while doing the API call
   */
  fetchCase: (silent?: boolean) => Promise<void>;
  updateCase: (newCase: Case) => void;
}

export const useGetCase = (caseId: string): UseGetCase => {
  const [state, dispatch] = useReducer(dataFetchReducer, {
    isLoading: false,
    isError: false,
    data: null,
    resolveOutcome: null,
  });
  const toasts = useToasts();
  const isCancelledRef = useRef(false);
  const abortCtrlRef = useRef(new AbortController());

  const updateCase = useCallback((newCase: Case) => {
    dispatch({ type: 'UPDATE_CASE', payload: newCase });
  }, []);

  const callFetch = useCallback(
    async (silent: boolean = false) => {
      try {
        isCancelledRef.current = false;
        abortCtrlRef.current.abort();
        abortCtrlRef.current = new AbortController();
        dispatch({ type: 'FETCH_INIT', payload: { silent } });

        const response: ResolvedCase = await resolveCase(caseId, true, abortCtrlRef.current.signal);

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
    },
    [caseId, toasts]
  );

  useEffect(() => {
    callFetch();

    return () => {
      isCancelledRef.current = true;
      abortCtrlRef.current.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);
  return { ...state, fetchCase: callFetch, updateCase };
};
