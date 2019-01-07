/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { SET_META } from '../actions/store_actions';

const INITIAL_STATE = {
  meta: null
};

// Reducer
function config(state = INITIAL_STATE, action) {
  switch (action.type) {
    case SET_META:
      return { ...state, meta: action.meta };
    default:
      return state;
  }
}

export default config;
