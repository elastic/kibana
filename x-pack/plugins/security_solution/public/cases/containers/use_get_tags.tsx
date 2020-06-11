/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useReducer } from 'react';

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

  const callFetch = () => {
    let didCancel = false;
    const abortCtrl = new AbortController();

    const fetchData = async () => {
      dispatch({ type: 'FETCH_INIT' });
      try {
        const response = await getTags(abortCtrl.signal);
        if (!didCancel) {
          dispatch({ type: 'FETCH_SUCCESS', payload: response });
        }
      } catch (error) {
        if (!didCancel) {
          errorToToaster({
            title: i18n.ERROR_TITLE,
            error: error.body && error.body.message ? new Error(error.body.message) : error,
            dispatchToaster,
          });
          dispatch({ type: 'FETCH_FAILURE' });
        }
      }
    };
    fetchData();
    return () => {
      abortCtrl.abort();
      didCancel = true;
    };
  };
  useEffect(() => {
    callFetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return { ...state, fetchTags: callFetch };
};
