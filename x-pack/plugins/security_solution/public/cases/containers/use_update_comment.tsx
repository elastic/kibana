/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useReducer, useCallback } from 'react';

import { errorToToaster, useStateToaster } from '../../common/components/toasters';

import { patchComment } from './api';
import * as i18n from './translations';
import { Case } from './types';

interface CommentUpdateState {
  isLoadingIds: string[];
  isError: boolean;
}
interface CommentUpdate {
  commentId: string;
}

type Action =
  | { type: 'FETCH_INIT'; payload: string }
  | { type: 'FETCH_SUCCESS'; payload: CommentUpdate }
  | { type: 'FETCH_FAILURE'; payload: string };

const dataFetchReducer = (state: CommentUpdateState, action: Action): CommentUpdateState => {
  switch (action.type) {
    case 'FETCH_INIT':
      return {
        ...state,
        isLoadingIds: [...state.isLoadingIds, action.payload],
        isError: false,
      };

    case 'FETCH_SUCCESS':
      return {
        ...state,
        isLoadingIds: state.isLoadingIds.filter((id) => action.payload.commentId !== id),
        isError: false,
      };
    case 'FETCH_FAILURE':
      return {
        ...state,
        isLoadingIds: state.isLoadingIds.filter((id) => action.payload !== id),
        isError: true,
      };
    default:
      return state;
  }
};

interface UpdateComment {
  caseId: string;
  commentId: string;
  commentUpdate: string;
  fetchUserActions: () => void;
  updateCase: (newCase: Case) => void;
  version: string;
}

export interface UseUpdateComment extends CommentUpdateState {
  patchComment: ({ caseId, commentId, commentUpdate, fetchUserActions }: UpdateComment) => void;
}

export const useUpdateComment = (): UseUpdateComment => {
  const [state, dispatch] = useReducer(dataFetchReducer, {
    isLoadingIds: [],
    isError: false,
  });
  const [, dispatchToaster] = useStateToaster();

  const dispatchUpdateComment = useCallback(
    async ({
      caseId,
      commentId,
      commentUpdate,
      fetchUserActions,
      updateCase,
      version,
    }: UpdateComment) => {
      let cancel = false;
      const abortCtrl = new AbortController();
      try {
        dispatch({ type: 'FETCH_INIT', payload: commentId });
        const response = await patchComment(
          caseId,
          commentId,
          commentUpdate,
          version,
          abortCtrl.signal
        );
        if (!cancel) {
          updateCase(response);
          fetchUserActions();
          dispatch({ type: 'FETCH_SUCCESS', payload: { commentId } });
        }
      } catch (error) {
        if (!cancel) {
          errorToToaster({
            title: i18n.ERROR_TITLE,
            error: error.body && error.body.message ? new Error(error.body.message) : error,
            dispatchToaster,
          });
          dispatch({ type: 'FETCH_FAILURE', payload: commentId });
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

  return { ...state, patchComment: dispatchUpdateComment };
};
