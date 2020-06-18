/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useReducer, useCallback } from 'react';

import { Case } from './types';
import * as i18n from './translations';
import { errorToToaster, useStateToaster } from '../../common/components/toasters';
import { getCase } from './api';

interface CaseState {
  data: Case;
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
export const initialData: Case = {
  id: '',
  closedAt: null,
  closedBy: null,
  createdAt: '',
  comments: [],
  connectorId: 'none',
  createdBy: {
    username: '',
  },
  description: '',
  externalService: null,
  status: '',
  tags: [],
  title: '',
  totalComment: 0,
  updatedAt: null,
  updatedBy: null,
  version: '',
};

export interface UseGetCase extends CaseState {
  fetchCase: () => void;
  updateCase: (newCase: Case) => void;
}

export const useGetCase = (caseId: string): UseGetCase => {
  const [state, dispatch] = useReducer(dataFetchReducer, {
    isLoading: true,
    isError: false,
    data: initialData,
  });
  const [, dispatchToaster] = useStateToaster();

  const updateCase = useCallback((newCase: Case) => {
    dispatch({ type: 'UPDATE_CASE', payload: newCase });
  }, []);

  const callFetch = useCallback(async () => {
    let didCancel = false;
    const abortCtrl = new AbortController();

    const fetchData = async () => {
      dispatch({ type: 'FETCH_INIT' });
      try {
        const response = await getCase(caseId, true, abortCtrl.signal);
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
      didCancel = true;
      abortCtrl.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  useEffect(() => {
    callFetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);
  return { ...state, fetchCase: callFetch, updateCase };
};
