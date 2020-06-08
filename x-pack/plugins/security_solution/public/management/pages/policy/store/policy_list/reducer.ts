/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isOnPolicyListPage } from './selectors';
import { ImmutableReducer } from '../../../../../common/store';
import { AppAction } from '../../../../../common/store/actions';
import { Immutable } from '../../../../../../common/endpoint/types';
import { PolicyListState } from '../../types';

/**
 * Return the initial state.
 * In case `state` was mutated, we return a fresh initial state object.
 */
export const initialPolicyListState: () => Immutable<PolicyListState> = () => ({
  policyItems: [],
  isLoading: false,
  apiError: undefined,
  pageIndex: 0,
  pageSize: 10,
  total: 0,
  location: undefined,
});

export const policyListReducer: ImmutableReducer<PolicyListState, AppAction> = (
  state = initialPolicyListState(),
  action
) => {
  if (action.type === 'serverReturnedPolicyListData') {
    return {
      ...state,
      ...action.payload,
      isLoading: false,
    };
  }

  if (action.type === 'serverFailedToReturnPolicyListData') {
    return {
      ...state,
      apiError: action.payload,
      isLoading: false,
    };
  }

  if (action.type === 'userChangedUrl') {
    const newState: Immutable<PolicyListState> = {
      ...state,
      location: action.payload,
    };
    const isCurrentlyOnListPage = isOnPolicyListPage(newState);
    const wasPreviouslyOnListPage = isOnPolicyListPage(state);

    // If on the current page, then return new state with location information
    // Also adjust some state if user is just entering the policy list view
    if (isCurrentlyOnListPage) {
      if (!wasPreviouslyOnListPage) {
        return {
          ...newState,
          apiError: undefined,
          isLoading: true,
        };
      }
      return newState;
    }
    return initialPolicyListState();
  }

  return state;
};
