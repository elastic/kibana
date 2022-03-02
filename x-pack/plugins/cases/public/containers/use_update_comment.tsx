/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useReducer, useCallback, useRef, useEffect } from 'react';
import { useToasts } from '../common/lib/kibana';
import { useCasesContext } from '../components/cases_context/use_cases_context';
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
  const toasts = useToasts();
  const isCancelledRef = useRef(false);
  const abortCtrlRef = useRef(new AbortController());
  // this hook guarantees that there will be at least one value in the owner array, we'll
  // just use the first entry just in case there are more than one entry
  const owner = useCasesContext().owner[0];

  const dispatchUpdateComment = useCallback(
    async ({
      caseId,
      commentId,
      commentUpdate,
      fetchUserActions,
      updateCase,
      version,
    }: UpdateComment) => {
      try {
        isCancelledRef.current = false;
        abortCtrlRef.current.abort();
        abortCtrlRef.current = new AbortController();
        dispatch({ type: 'FETCH_INIT', payload: commentId });

        const response = await patchComment({
          caseId,
          commentId,
          commentUpdate,
          version,
          signal: abortCtrlRef.current.signal,
          owner,
        });

        if (!isCancelledRef.current) {
          updateCase(response);
          fetchUserActions();
          dispatch({ type: 'FETCH_SUCCESS', payload: { commentId } });
        }
      } catch (error) {
        if (!isCancelledRef.current) {
          if (error.name !== 'AbortError') {
            toasts.addError(
              error.body && error.body.message ? new Error(error.body.message) : error,
              { title: i18n.ERROR_TITLE }
            );
          }
          dispatch({ type: 'FETCH_FAILURE', payload: commentId });
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

  return { ...state, patchComment: dispatchUpdateComment };
};
