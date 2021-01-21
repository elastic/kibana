/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useReducer, useCallback } from 'react';

import { errorToToaster, useStateToaster } from '../../common/components/toasters';

import { patchCase } from './api';
import { UpdateKey, UpdateByKey } from './types';
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
export const useUpdateCase = ({ caseId }: { caseId: string }): UseUpdateCase => {
  const [state, dispatch] = useReducer(dataFetchReducer, {
    isLoading: false,
    isError: false,
    updateKey: null,
  });
  const [, dispatchToaster] = useStateToaster();

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
      let cancel = false;
      const abortCtrl = new AbortController();

      try {
        dispatch({ type: 'FETCH_INIT', payload: updateKey });
        const response = await patchCase(
          caseId,
          { [updateKey]: updateValue },
          caseData.version,
          abortCtrl.signal
        );
        if (!cancel) {
          if (fetchCaseUserActions != null) {
            fetchCaseUserActions(caseId);
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
        if (!cancel) {
          errorToToaster({
            title: i18n.ERROR_TITLE,
            error: error.body && error.body.message ? new Error(error.body.message) : error,
            dispatchToaster,
          });
          dispatch({ type: 'FETCH_FAILURE' });
          if (onError) {
            onError();
          }
        }
      }
      return () => {
        cancel = true;
        abortCtrl.abort();
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return { ...state, updateCaseProperty: dispatchUpdateCaseProperty };
};
