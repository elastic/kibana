/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useReducer, useRef, useEffect } from 'react';
import { CaseStatuses } from '../../common/api';
import * as i18n from './translations';
import { patchCasesStatus } from './api';
import { BulkUpdateStatus, Case } from './types';
import { useToasts } from '../common/lib/kibana';

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

const getStatusToasterMessage = (
  status: CaseStatuses,
  messageArgs: {
    totalCases: number;
    caseTitle?: string;
  }
): string => {
  if (status === CaseStatuses.open) {
    return i18n.REOPENED_CASES(messageArgs);
  } else if (status === CaseStatuses['in-progress']) {
    return i18n.MARK_IN_PROGRESS_CASES(messageArgs);
  } else if (status === CaseStatuses.closed) {
    return i18n.CLOSED_CASES(messageArgs);
  }

  return '';
};

export const useUpdateCases = (): UseUpdateCases => {
  const [state, dispatch] = useReducer(dataFetchReducer, {
    isLoading: false,
    isError: false,
    isUpdated: false,
  });
  const toasts = useToasts();
  const isCancelledRef = useRef(false);
  const abortCtrlRef = useRef(new AbortController());

  const dispatchUpdateCases = useCallback(async (cases: BulkUpdateStatus[], action: string) => {
    try {
      isCancelledRef.current = false;
      abortCtrlRef.current.abort();
      abortCtrlRef.current = new AbortController();

      dispatch({ type: 'FETCH_INIT' });
      const patchResponse = await patchCasesStatus(cases, abortCtrlRef.current.signal);

      if (!isCancelledRef.current) {
        const resultCount = Object.keys(patchResponse).length;
        const firstTitle = patchResponse[0].title;

        dispatch({ type: 'FETCH_SUCCESS', payload: true });
        const messageArgs = {
          totalCases: resultCount,
          caseTitle: resultCount === 1 ? firstTitle : '',
        };

        const message =
          action === 'status' ? getStatusToasterMessage(patchResponse[0].status, messageArgs) : '';

        toasts.addSuccess(message);
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

  const dispatchResetIsUpdated = useCallback(() => {
    dispatch({ type: 'RESET_IS_UPDATED' });
  }, []);

  const updateBulkStatus = useCallback(
    (cases: Case[], status: string) => {
      const updateCasesStatus: BulkUpdateStatus[] = cases.map((theCase) => ({
        status,
        id: theCase.id,
        version: theCase.version,
      }));
      dispatchUpdateCases(updateCasesStatus, 'status');
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

  return { ...state, updateBulkStatus, dispatchResetIsUpdated };
};
