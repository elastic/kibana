/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useReducer, useCallback } from 'react';

import { CommentRequest } from '../../../../case/common/api';
import { errorToToaster, useStateToaster } from '../../common/components/toasters';

import { postComment } from './api';
import * as i18n from './translations';
import { Case } from './types';

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

export interface UsePostComment extends NewCommentState {
  postComment: (data: CommentRequest, updateCase: (newCase: Case) => void) => void;
}

export const usePostComment = (caseId: string): UsePostComment => {
  const [state, dispatch] = useReducer(dataFetchReducer, {
    isLoading: false,
    isError: false,
  });
  const [, dispatchToaster] = useStateToaster();

  const postMyComment = useCallback(
    async (data: CommentRequest, updateCase: (newCase: Case) => void) => {
      let cancel = false;
      const abortCtrl = new AbortController();

      try {
        dispatch({ type: 'FETCH_INIT' });
        const response = await postComment(data, caseId, abortCtrl.signal);
        if (!cancel) {
          dispatch({ type: 'FETCH_SUCCESS' });
          updateCase(response);
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
      return () => {
        abortCtrl.abort();
        cancel = true;
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [caseId]
  );

  return { ...state, postComment: postMyComment };
};
