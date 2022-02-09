/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useReducer, useRef, useEffect } from 'react';
import * as i18n from './translations';
import { deleteCases } from './api';
import { DeleteCase } from './types';
import { useToasts } from '../common/lib/kibana';

interface DeleteState {
  isDisplayConfirmDeleteModal: boolean;
  isDeleted: boolean;
  isLoading: boolean;
  isError: boolean;
}
type Action =
  | { type: 'DISPLAY_MODAL'; payload: boolean }
  | { type: 'FETCH_INIT' }
  | { type: 'FETCH_SUCCESS'; payload: boolean }
  | { type: 'FETCH_FAILURE' }
  | { type: 'RESET_IS_DELETED' };

const dataFetchReducer = (state: DeleteState, action: Action): DeleteState => {
  switch (action.type) {
    case 'DISPLAY_MODAL':
      return {
        ...state,
        isDisplayConfirmDeleteModal: action.payload,
      };
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
        isDeleted: action.payload,
      };
    case 'FETCH_FAILURE':
      return {
        ...state,
        isLoading: false,
        isError: true,
      };
    case 'RESET_IS_DELETED':
      return {
        ...state,
        isDeleted: false,
      };
    default:
      return state;
  }
};

export interface UseDeleteCase extends DeleteState {
  dispatchResetIsDeleted: () => void;
  handleOnDeleteConfirm: (cases: DeleteCase[]) => void;
  handleToggleModal: () => void;
}

export const useDeleteCases = (): UseDeleteCase => {
  const [state, dispatch] = useReducer(dataFetchReducer, {
    isDisplayConfirmDeleteModal: false,
    isLoading: false,
    isError: false,
    isDeleted: false,
  });
  const toasts = useToasts();
  const isCancelledRef = useRef(false);
  const abortCtrlRef = useRef(new AbortController());

  const dispatchDeleteCases = useCallback(async (cases: DeleteCase[]) => {
    try {
      isCancelledRef.current = false;
      abortCtrlRef.current.abort();
      abortCtrlRef.current = new AbortController();
      dispatch({ type: 'FETCH_INIT' });

      const caseIds = cases.map((theCase) => theCase.id);
      if (cases.length > 0) {
        await deleteCases(caseIds, abortCtrlRef.current.signal);
      }

      if (!isCancelledRef.current) {
        dispatch({ type: 'FETCH_SUCCESS', payload: true });
        toasts.addSuccess(
          i18n.DELETED_CASES(cases.length, cases.length === 1 ? cases[0].title : '')
        );
      }
    } catch (error) {
      if (!isCancelledRef.current) {
        if (error.name !== 'AbortError') {
          toasts.addError(
            error.body && error.body.message ? new Error(error.body.message) : error,
            { title: i18n.ERROR_DELETING }
          );
        }
        dispatch({ type: 'FETCH_FAILURE' });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dispatchToggleDeleteModal = useCallback(() => {
    dispatch({ type: 'DISPLAY_MODAL', payload: !state.isDisplayConfirmDeleteModal });
  }, [state.isDisplayConfirmDeleteModal]);

  const dispatchResetIsDeleted = useCallback(() => {
    dispatch({ type: 'RESET_IS_DELETED' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.isDisplayConfirmDeleteModal]);

  const handleOnDeleteConfirm = useCallback(
    (cases: DeleteCase[]) => {
      dispatchDeleteCases(cases);
      dispatchToggleDeleteModal();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.isDisplayConfirmDeleteModal]
  );
  const handleToggleModal = useCallback(() => {
    dispatchToggleDeleteModal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.isDisplayConfirmDeleteModal]);

  useEffect(
    () => () => {
      isCancelledRef.current = true;
      abortCtrlRef.current.abort();
    },
    []
  );

  return { ...state, dispatchResetIsDeleted, handleOnDeleteConfirm, handleToggleModal };
};
