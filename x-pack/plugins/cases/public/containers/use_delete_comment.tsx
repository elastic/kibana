/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useReducer, useCallback, useRef, useEffect } from 'react';
import { useToasts } from '../common/lib/kibana';
import { useRefreshCaseViewPage } from '../components/case_view/use_on_refresh_case_view_page';
import { deleteComment } from './api';
import * as i18n from './translations';

interface CommentDeleteState {
  isError: boolean;
}
interface CommentDelete {
  commentId: string;
}

type Action =
  | { type: 'FETCH_INIT'; payload: string }
  | { type: 'FETCH_SUCCESS'; payload: CommentDelete }
  | { type: 'FETCH_FAILURE'; payload: string };

const dataFetchReducer = (state: CommentDeleteState, action: Action): CommentDeleteState => {
  switch (action.type) {
    case 'FETCH_INIT':
      return {
        ...state,
        isError: false,
      };

    case 'FETCH_SUCCESS':
      return {
        ...state,
        isError: false,
      };
    case 'FETCH_FAILURE':
      return {
        ...state,
        isError: true,
      };
    default:
      return state;
  }
};

interface DeleteComment {
  caseId: string;
  commentId: string;
}

export interface UseDeleteComment extends CommentDeleteState {
  deleteComment: ({ caseId, commentId }: DeleteComment) => void;
}

export const useDeleteComment = (): UseDeleteComment => {
  const [state, dispatch] = useReducer(dataFetchReducer, {
    isError: false,
  });
  const toasts = useToasts();
  const isCancelledRef = useRef(false);
  const abortCtrlRef = useRef(new AbortController());
  const refreshCaseViewPage = useRefreshCaseViewPage();

  const dispatchDeleteComment = useCallback(
    async ({ caseId, commentId }: DeleteComment) => {
      try {
        isCancelledRef.current = false;
        abortCtrlRef.current.abort();
        abortCtrlRef.current = new AbortController();
        dispatch({ type: 'FETCH_INIT', payload: commentId });

        await deleteComment({
          caseId,
          commentId,
          signal: abortCtrlRef.current.signal,
        });

        if (!isCancelledRef.current) {
          refreshCaseViewPage();
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

  return { ...state, deleteComment: dispatchDeleteComment };
};
