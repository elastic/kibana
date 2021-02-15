/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useReducer, useRef, useCallback } from 'react';
import { errorToToaster, useStateToaster } from '../../common/components/toasters';
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
  const [state, dispatch] = useReducer(dataFetchReducer, {
    isLoading: true,
    isError: false,
    tags: initialData,
  });
  const [, dispatchToaster] = useStateToaster();
  const didCancel = useRef(false);
  const abortCtrl = useRef(new AbortController());

  const callFetch = useCallback(async () => {
    try {
      didCancel.current = false;
      abortCtrl.current.abort();
      abortCtrl.current = new AbortController();
      dispatch({ type: 'FETCH_INIT' });

      const response = await getTags(abortCtrl.current.signal);

      if (!didCancel.current) {
        dispatch({ type: 'FETCH_SUCCESS', payload: response });
      }
    } catch (error) {
      if (!didCancel.current) {
        if (error.name !== 'AbortError') {
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
    callFetch();
    return () => {
      didCancel.current = true;
      abortCtrl.current.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return { ...state, fetchTags: callFetch };
};
