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
import { patchCasesStatus } from './api';
import { BulkUpdateStatus, Case } from './types';

interface UpdateState {
  isUpdated: boolean;
  isLoading: boolean;
  isError: boolean;
}
type Action =
  | { type: 'FETCH_INIT' }
  | { type: 'FETCH_SUCCESS'; payload: boolean }
  | { type: 'FETCH_FAILURE' }
  | { type: 'RESET_IS_UPDATED' };

const dataFetchReducer = (state: UpdateState, action: Action): UpdateState => {
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
        isUpdated: action.payload,
      };
    case 'FETCH_FAILURE':
      return {
        ...state,
        isLoading: false,
        isError: true,
      };
    case 'RESET_IS_UPDATED':
      return {
        ...state,
        isUpdated: false,
      };
    default:
      return state;
  }
};
export interface UseUpdateCases extends UpdateState {
  updateBulkStatus: (cases: Case[], status: string) => void;
  dispatchResetIsUpdated: () => void;
}

export const useUpdateCases = (): UseUpdateCases => {
  const [state, dispatch] = useReducer(dataFetchReducer, {
    isLoading: false,
    isError: false,
    isUpdated: false,
  });
  const [, dispatchToaster] = useStateToaster();

  const dispatchUpdateCases = useCallback((cases: BulkUpdateStatus[]) => {
    let cancel = false;
    const abortCtrl = new AbortController();

    const patchData = async () => {
      try {
        dispatch({ type: 'FETCH_INIT' });
        const patchResponse = await patchCasesStatus(cases, abortCtrl.signal);
        if (!cancel) {
          const resultCount = Object.keys(patchResponse).length;
          const firstTitle = patchResponse[0].title;

          dispatch({ type: 'FETCH_SUCCESS', payload: true });
          const messageArgs = {
            totalCases: resultCount,
            caseTitle: resultCount === 1 ? firstTitle : '',
          };
          const message =
            resultCount && patchResponse[0].status === 'open'
              ? i18n.REOPENED_CASES(messageArgs)
              : i18n.CLOSED_CASES(messageArgs);

          displaySuccessToast(message, dispatchToaster);
        }
      } catch (error) {
        if (!cancel) {
          errorToToaster({
            title: i18n.ERROR_TITLE,
            error: error.body && error.body.message ? new Error(error.body.message) : error,
            dispatchToaster,
          });
          dispatch({ type: 'FETCH_FAILURE' });
        }
      }
    };
    patchData();
    return () => {
      cancel = true;
      abortCtrl.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dispatchResetIsUpdated = useCallback(() => {
    dispatch({ type: 'RESET_IS_UPDATED' });
  }, []);

  const updateBulkStatus = useCallback((cases: Case[], status: string) => {
    const updateCasesStatus: BulkUpdateStatus[] = cases.map((theCase) => ({
      status,
      id: theCase.id,
      version: theCase.version,
    }));
    dispatchUpdateCases(updateCasesStatus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return { ...state, updateBulkStatus, dispatchResetIsUpdated };
};
