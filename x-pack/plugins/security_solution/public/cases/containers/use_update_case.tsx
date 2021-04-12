/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useReducer, useCallback, useRef, useEffect } from 'react';

import { errorToToaster, useStateToaster } from '../../common/components/toasters';
import { patchCase, patchSubCase } from './api';
import { UpdateKey, UpdateByKey, CaseStatuses } from './types';
import * as i18n from './translations';
import { createUpdateSuccessToaster } from './utils';

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
export const useUpdateCase = ({
  caseId,
  subCaseId,
}: {
  caseId: string;
  subCaseId?: string;
}): UseUpdateCase => {
  const [state, dispatch] = useReducer(dataFetchReducer, {
    isLoading: false,
    isError: false,
    updateKey: null,
  });
  const [, dispatchToaster] = useStateToaster();
  const isCancelledRef = useRef(false);
  const abortCtrlRef = useRef(new AbortController());

  const dispatchUpdateCaseProperty = useCallback(
    async ({
      fetchCaseUserActions,
      updateKey,
      updateValue,
      updateCase,
      caseData,
      onSuccess,
      onError,
    }: UpdateByKey) => {
      try {
        isCancelledRef.current = false;
        abortCtrlRef.current.abort();
        abortCtrlRef.current = new AbortController();
        dispatch({ type: 'FETCH_INIT', payload: updateKey });

        const response = await (updateKey === 'status' && subCaseId
          ? patchSubCase(
              caseId,
              subCaseId,
              { status: updateValue as CaseStatuses },
              caseData.version,
              abortCtrlRef.current.signal
            )
          : patchCase(
              caseId,
              { [updateKey]: updateValue },
              caseData.version,
              abortCtrlRef.current.signal
            ));

        if (!isCancelledRef.current) {
          if (fetchCaseUserActions != null) {
            fetchCaseUserActions(caseId, response[0].connector.id, subCaseId);
          }
          if (updateCase != null) {
            updateCase(response[0]);
          }
          dispatch({ type: 'FETCH_SUCCESS' });
          dispatchToaster({
            type: 'addToaster',
            toast: createUpdateSuccessToaster(caseData, response[0], updateKey, updateValue),
          });

          if (onSuccess) {
            onSuccess();
          }
        }
      } catch (error) {
        if (!isCancelledRef.current) {
          if (error.name !== 'AbortError') {
            errorToToaster({
              title: i18n.ERROR_TITLE,
              error: error.body && error.body.message ? new Error(error.body.message) : error,
              dispatchToaster,
            });
          }
          dispatch({ type: 'FETCH_FAILURE' });
          if (onError) {
            onError();
          }
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [caseId, subCaseId]
  );

  useEffect(() => {
    return () => {
      isCancelledRef.current = true;
      abortCtrlRef.current.abort();
    };
  }, []);

  return { ...state, updateCaseProperty: dispatchUpdateCaseProperty };
};
