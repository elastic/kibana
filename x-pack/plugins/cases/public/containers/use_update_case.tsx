/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useReducer, useCallback, useRef, useEffect } from 'react';

import { useToasts } from '../common/lib/kibana';
import { patchCase } from './api';
import type { UpdateKey, UpdateByKey } from '../../common/ui/types';
import * as i18n from './translations';
import { createUpdateSuccessToaster } from './utils';
import { useRefreshCaseViewPage } from '../components/case_view/use_on_refresh_case_view_page';

interface NewCaseState {
  isLoading: boolean;
  isError: boolean;
  updateKey: UpdateKey | null;
}

type Action =
  | { type: 'FETCH_INIT'; payload: UpdateKey }
  | { type: 'FETCH_SUCCESS' }
  | { type: 'FETCH_FAILURE' };

const dataFetchReducer = (state: NewCaseState, action: Action): NewCaseState => {
  switch (action.type) {
    case 'FETCH_INIT':
      return {
        ...state,
        isLoading: true,
        isError: false,
        updateKey: action.payload,
      };

    case 'FETCH_SUCCESS':
      return {
        ...state,
        isLoading: false,
        isError: false,
        updateKey: null,
      };
    case 'FETCH_FAILURE':
      return {
        ...state,
        isLoading: false,
        isError: true,
        updateKey: null,
      };
    default:
      return state;
  }
};

export interface UseUpdateCase extends NewCaseState {
  updateCaseProperty: (updates: UpdateByKey) => void;
}
export const useUpdateCase = (): UseUpdateCase => {
  const [state, dispatch] = useReducer(dataFetchReducer, {
    isLoading: false,
    isError: false,
    updateKey: null,
  });
  const toasts = useToasts();
  const isCancelledRef = useRef(false);
  const abortCtrlRef = useRef(new AbortController());
  const refreshCaseViewPage = useRefreshCaseViewPage();

  const dispatchUpdateCaseProperty = useCallback(
    async ({ updateKey, updateValue, caseData, onSuccess, onError }: UpdateByKey) => {
      try {
        isCancelledRef.current = false;
        abortCtrlRef.current.abort();
        abortCtrlRef.current = new AbortController();
        dispatch({ type: 'FETCH_INIT', payload: updateKey });

        const response = await patchCase(
          caseData.id,
          { [updateKey]: updateValue },
          caseData.version,
          abortCtrlRef.current.signal
        );

        if (!isCancelledRef.current) {
          refreshCaseViewPage();
          dispatch({ type: 'FETCH_SUCCESS' });
          toasts.addSuccess(
            createUpdateSuccessToaster(caseData, response[0], updateKey, updateValue)
          );

          if (onSuccess) {
            onSuccess();
          }
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
          if (onError) {
            onError();
          }
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useEffect(
    () => () => {
      isCancelledRef.current = true;
      abortCtrlRef.current.abort();
    },
    []
  );

  return { ...state, updateCaseProperty: dispatchUpdateCaseProperty };
};
