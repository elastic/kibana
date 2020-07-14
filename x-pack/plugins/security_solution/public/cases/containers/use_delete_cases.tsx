/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useCallback, useReducer } from 'react';
import {
  displaySuccessToast,
  errorToToaster,
  useStateToaster,
} from '../../common/components/toasters';
import * as i18n from './translations';
import { deleteCases } from './api';
import { DeleteCase } from './types';

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
  const [, dispatchToaster] = useStateToaster();

  const dispatchDeleteCases = useCallback((cases: DeleteCase[]) => {
    let cancel = false;
    const abortCtrl = new AbortController();

    const deleteData = async () => {
      try {
        dispatch({ type: 'FETCH_INIT' });
        const caseIds = cases.map((theCase) => theCase.id);
        await deleteCases(caseIds, abortCtrl.signal);
        if (!cancel) {
          dispatch({ type: 'FETCH_SUCCESS', payload: true });
          displaySuccessToast(
            i18n.DELETED_CASES(cases.length, cases.length === 1 ? cases[0].title : ''),
            dispatchToaster
          );
        }
      } catch (error) {
        if (!cancel) {
          errorToToaster({
            title: i18n.ERROR_DELETING,
            error: error.body && error.body.message ? new Error(error.body.message) : error,
            dispatchToaster,
          });
          dispatch({ type: 'FETCH_FAILURE' });
        }
      }
    };
    deleteData();
    return () => {
      abortCtrl.abort();
      cancel = true;
    };
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

  return { ...state, dispatchResetIsDeleted, handleOnDeleteConfirm, handleToggleModal };
};
