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
        if (action.payload!.roles) {
          // If security is enabled and the roles field is set. Then we should check the
          // 'code_admin' and 'code_user' roles.
          draft.isCodeAdmin =
            action.payload!.roles.includes('code_admin') ||
            // 'superuser' should be deemed as code admin user as well.
            action.payload!.roles.includes('superuser');
          draft.isCodeUser = action.payload!.roles.includes('code_user');
        } else {
          // If security is not enabled, then every user is code admin.
          draft.isCodeAdmin = true;
        }
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
