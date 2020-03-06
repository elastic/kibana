/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Dispatch, SetStateAction, useEffect, useReducer, useState } from 'react';
import { useStateToaster } from '../../components/toasters';
import { errorToToaster } from '../../components/ml/api/error_to_toaster';
import * as i18n from './translations';
import { FETCH_FAILURE, FETCH_INIT, FETCH_SUCCESS, POST_NEW_COMMENT } from './constants';
import { Comment, NewComment } from './types';
import { createComment } from './api';
import { getTypedPayload } from './utils';

interface NewCommentState {
  data: NewComment;
  newComment?: Comment;
  isLoading: boolean;
  isError: boolean;
  caseId: string;
}
interface Action {
  type: string;
  payload?: NewComment | Comment;
}

const dataFetchReducer = (state: NewCommentState, action: Action): NewCommentState => {
  switch (action.type) {
    case FETCH_INIT:
      return {
        ...state,
        isLoading: true,
        isError: false,
      };
    case POST_NEW_COMMENT:
      return {
        ...state,
        isLoading: false,
        isError: false,
        data: getTypedPayload<NewComment>(action.payload),
      };
    case FETCH_SUCCESS:
      return {
        ...state,
        isLoading: false,
        isError: false,
        newComment: getTypedPayload<Comment>(action.payload),
      };
    case FETCH_FAILURE:
      return {
        ...state,
        isLoading: false,
        isError: true,
      };
    default:
      throw new Error();
  }
};
const initialData: NewComment = {
  comment: '',
};

export const usePostComment = (
  caseId: string
): [NewCommentState, Dispatch<SetStateAction<NewComment>>] => {
  const [state, dispatch] = useReducer(dataFetchReducer, {
    isLoading: false,
    isError: false,
    caseId,
    data: initialData,
  });
  const [formData, setFormData] = useState(initialData);
  const [, dispatchToaster] = useStateToaster();

  useEffect(() => {
    dispatch({ type: POST_NEW_COMMENT, payload: formData });
  }, [formData]);

  useEffect(() => {
    const postComment = async () => {
      dispatch({ type: FETCH_INIT });
      try {
        const { isNew, ...dataWithoutIsNew } = state.data;
        const response = await createComment(dataWithoutIsNew, state.caseId);
        dispatch({ type: FETCH_SUCCESS, payload: response });
      } catch (error) {
        errorToToaster({ title: i18n.ERROR_TITLE, error, dispatchToaster });
        dispatch({ type: FETCH_FAILURE });
      }
    };
    if (state.data.isNew) {
      postComment();
    }
  }, [state.data.isNew]);
  return [state, setFormData];
};
