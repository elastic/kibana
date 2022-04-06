/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useReducer, useCallback, useRef, useEffect } from 'react';
import { CommentRequest } from '../../common/api';

import { postComment } from './api';
import * as i18n from './translations';
import { Case } from './types';
import { useToasts } from '../common/lib/kibana';

interface NewCommentState {
  isLoading: boolean;
  isError: boolean;
}
type Action = { type: 'FETCH_INIT' } | { type: 'FETCH_SUCCESS' } | { type: 'FETCH_FAILURE' };

const dataFetchReducer = (state: NewCommentState, action: Action): NewCommentState => {
  switch (action.type) {
    case 'FETCH_INIT':
      return {
        isLoading: true,
        isError: false,
      };
    case 'FETCH_SUCCESS':
      return {
        isLoading: false,
        isError: false,
      };
    case 'FETCH_FAILURE':
      return {
        isLoading: false,
        isError: true,
      };
    default:
      return state;
  }
};

export interface PostComment {
  caseId: string;
  data: CommentRequest;
  updateCase?: (newCase: Case) => void;
  throwOnError?: boolean;
}
export interface UsePostComment extends NewCommentState {
  postComment: (args: PostComment) => Promise<void>;
}

export const usePostComment = (): UsePostComment => {
  const [state, dispatch] = useReducer(dataFetchReducer, {
    isLoading: false,
    isError: false,
  });
  const toasts = useToasts();
  const isCancelledRef = useRef(false);
  const abortCtrlRef = useRef(new AbortController());

  const postMyComment = useCallback(
    async ({ caseId, data, updateCase, throwOnError }: PostComment) => {
      try {
        isCancelledRef.current = false;
        abortCtrlRef.current.abort();
        abortCtrlRef.current = new AbortController();
        dispatch({ type: 'FETCH_INIT' });

        const response = await postComment(data, caseId, abortCtrlRef.current.signal);

        if (!isCancelledRef.current) {
          dispatch({ type: 'FETCH_SUCCESS' });
          if (updateCase) {
            updateCase(response);
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
          if (throwOnError) {
            throw error;
          }
        }
      }
    },
    [toasts]
  );

  useEffect(
    () => () => {
      isCancelledRef.current = true;
      abortCtrlRef.current.abort();
    },
    []
  );

  return { ...state, postComment: postMyComment };
};
