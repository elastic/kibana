/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import produce from 'immer';
import { handleActions } from 'redux-actions';

import { checkSetupFailed, checkSetupSuccess } from '../actions';

export interface SetupState {
  ok?: boolean;
}

const initialState: SetupState = {};

export const setup = handleActions(
  {
    [String(checkSetupFailed)]: (state: SetupState) =>
      produce<SetupState>(state, draft => {
        draft.ok = false;
      }),
    [String(checkSetupSuccess)]: (state: SetupState) =>
      produce<SetupState>(state, draft => {
        draft.ok = true;
      }),
  },
  initialState
);
