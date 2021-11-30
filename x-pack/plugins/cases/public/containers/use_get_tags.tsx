/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useReducer, useRef, useCallback } from 'react';
import { useToasts } from '../common/lib/kibana';
import { useCasesContext } from '../components/cases_context/use_cases_context';
import { getTags } from './api';
import * as i18n from './translations';

export interface TagsState {
  tags: string[];
  isLoading: boolean;
  isError: boolean;
}
type Action =
  | { type: 'FETCH_INIT' }
  | { type: 'FETCH_SUCCESS'; payload: string[] }
  | { type: 'FETCH_FAILURE' };

export interface UseGetTags extends TagsState {
  fetchTags: () => void;
}

const dataFetchReducer = (state: TagsState, action: Action): TagsState => {
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
        tags: action.payload,
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
const initialData: string[] = [];

export const useGetTags = (): UseGetTags => {
  const { owner } = useCasesContext();
  const [state, dispatch] = useReducer(dataFetchReducer, {
    isLoading: true,
    isError: false,
    tags: initialData,
  });
  const toasts = useToasts();
  const isCancelledRef = useRef(false);
  const abortCtrlRef = useRef(new AbortController());

  const callFetch = useCallback(async () => {
    try {
      isCancelledRef.current = false;
      abortCtrlRef.current.abort();
      abortCtrlRef.current = new AbortController();
      dispatch({ type: 'FETCH_INIT' });

      const response = await getTags(abortCtrlRef.current.signal, owner);

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
  }, []);

  useEffect(() => {
    callFetch();
    return () => {
      isCancelledRef.current = true;
      abortCtrlRef.current.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return { ...state, fetchTags: callFetch };
};
