/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SECTIONS } from '../../constants';
import { HttpRequestError } from '../../types';
import * as t from '../action_types';
import { ApiActions } from '../actions';

export interface AutoFollowPatternState {
  status: { [key: string]: string };
  error: { [key: string]: HttpRequestError | null };
}

const initialState: AutoFollowPatternState = {
  status: {
    [SECTIONS.AUTO_FOLLOW_PATTERN]: 'idle',
    [SECTIONS.INDEX_FOLLOWER]: 'idle',
  },
  error: {
    [SECTIONS.AUTO_FOLLOW_PATTERN]: null,
    [SECTIONS.INDEX_FOLLOWER]: null,
  },
};

export const reducer = (state = initialState, action: ApiActions) => {
  switch (action.type) {
    case t.API_START: {
      return { ...state, status: { ...state.status, [action.payload.scope]: 'loading' } };
    }
    case t.API_END: {
      return { ...state, status: { ...state.status, [action.payload.scope]: 'idle' } };
    }
    case t.API_ERROR: {
      return { ...state, error: { ...state.error, [action.payload.scope]: 'idle' } };
    }
    default:
      return state;
  }
};
