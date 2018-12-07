/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import produce from 'immer';
import { Action, handleActions } from 'redux-actions';

import { routeChange } from '../actions';

export interface RouteState {
  match: any;
}

const initialState: RouteState = {
  match: {},
};

export const route = handleActions(
  {
    [String(routeChange)]: (state: RouteState, action: Action<any>) =>
      produce<RouteState>(state, draft => {
        draft.match = action.payload;
      }),
  },
  initialState
);
