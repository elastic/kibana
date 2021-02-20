/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import { useEffect, useReducer, useCallback, useRef } from 'react';
import { CaseStatuses, CaseType } from '../../../../case/common/api';

import { Case } from './types';
import * as i18n from './translations';
import { errorToToaster, useStateToaster } from '../../common/components/toasters';
import { getCase, getSubCase } from './api';
import { getNoneConnector } from '../components/configure_cases/utils';

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
  connector: { ...getNoneConnector(), fields: null },
  createdBy: {
    username: '',
  },
  description: '',
  externalService: null,
  status: CaseStatuses.open,
  tags: [],
  title: '',
  totalAlerts: 0,
  totalComment: 0,
  type: CaseType.individual,
  updatedAt: null,
  updatedBy: null,
  version: '',
  subCaseIds: [],
  settings: {
    syncAlerts: true,
  },
};

export interface UseGetCase extends CaseState {
  fetchCase: () => void;
  updateCase: (newCase: Case) => void;
}

export const useGetCase = (caseId: string, subCaseId?: string): UseGetCase => {
  const [state, dispatch] = useReducer(dataFetchReducer, {
    isLoading: true,
    isError: false,
    data: initialData,
  });
  const [, dispatchToaster] = useStateToaster();
  const abortCtrl = useRef(new AbortController());
  const didCancel = useRef(false);

  const updateCase = useCallback((newCase: Case) => {
    dispatch({ type: 'UPDATE_CASE', payload: newCase });
  }, []);

  const callFetch = useCallback(async () => {
    const fetchData = async () => {
      dispatch({ type: 'FETCH_INIT' });
      try {
        const response = await (subCaseId
          ? getSubCase(caseId, subCaseId, true, abortCtrl.current.signal)
          : getCase(caseId, true, abortCtrl.current.signal));
        if (!didCancel.current) {
          dispatch({ type: 'FETCH_SUCCESS', payload: response });
        }
      } catch (error) {
        if (!didCancel.current) {
          errorToToaster({
            title: i18n.ERROR_TITLE,
            error: error.body && error.body.message ? new Error(error.body.message) : error,
            dispatchToaster,
          });
          dispatch({ type: 'FETCH_FAILURE' });
        }
      }
    };
    didCancel.current = false;
    abortCtrl.current.abort();
    abortCtrl.current = new AbortController();
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId, subCaseId]);

  useEffect(() => {
    if (!isEmpty(caseId)) {
      callFetch();
    }
    return () => {
      didCancel.current = true;
      abortCtrl.current.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId, subCaseId]);
  return { ...state, fetchCase: callFetch, updateCase };
};
