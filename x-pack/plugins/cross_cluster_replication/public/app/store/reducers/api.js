/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SECTIONS, API_STATUS } from '../../constants';
import * as t from '../action_types';

const initialState = {
  status: {
    [SECTIONS.AUTO_FOLLOW_PATTERN]: API_STATUS.IDLE,
    [SECTIONS.INDEX_FOLLOWER]: API_STATUS.IDLE,
  },
  error: {
    [SECTIONS.AUTO_FOLLOW_PATTERN]: null,
    [SECTIONS.INDEX_FOLLOWER]: null,
  },
};

export const reducer = (state = initialState, action) => {
  switch (action.type) {
    case t.API_START: {
      return { ...state, status: { ...state.status, [action.payload.scope]: API_STATUS.LOADING } };
    }
    case t.API_END: {
      return { ...state, status: { ...state.status, [action.payload.scope]: API_STATUS.IDLE } };
    }
    case t.API_ERROR: {
      return { ...state, error: { ...state.error, [action.payload.scope]: API_STATUS.IDLE } };
    }
    default:
      return state;
  }
};
