/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import produce from 'immer';
import { Action, handleActions } from 'redux-actions';

import { loadUserProfile, loadUserProfileFailed, loadUserProfileSuccess } from '../actions';

export interface UserProfileState {
  isCodeAdmin: boolean;
  isCodeUser: boolean;
  error?: Error;
}

const initialState: UserProfileState = {
  isCodeAdmin: false,
  isCodeUser: false,
};

export const userProfile = handleActions(
  {
    [String(loadUserProfile)]: (state: UserProfileState, action: Action<any>) =>
      produce<UserProfileState>(state, draft => {
        draft.error = undefined;
      }),
    [String(loadUserProfileSuccess)]: (state: UserProfileState, action: Action<any>) =>
      produce<UserProfileState>(state, draft => {
        draft.isCodeAdmin = action.payload!.roles.includes('code_admin');
        draft.isCodeUser = action.payload!.roles.includes('code_user');
      }),
    [String(loadUserProfileFailed)]: (state: UserProfileState, action: Action<any>) => {
      if (action.payload) {
        return produce<UserProfileState>(state, draft => {
          draft.error = action.payload;
        });
      } else {
        return state;
      }
    },
  },
  initialState
);
