/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Reducer } from 'redux';
import { PolicyListState } from '../../types';
import { AppAction } from '../action';
import { isOnPolicyListPage } from './selectors';

const initialPolicyListState = (): PolicyListState => {
  return {
    policyItems: [],
    isLoading: false,
    apiError: undefined,
    pageIndex: 0,
    pageSize: 10,
    total: 0,
    location: undefined,
  };
};

export const policyListReducer: Reducer<PolicyListState, AppAction> = (
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
    const newState = {
      ...state,
      location: action.payload,
    };
    const isCurrentlyOnListPage = isOnPolicyListPage(newState);
    const wasPreviouslyOnListPage = isOnPolicyListPage(state);

    // If on the current page, then return new state with location information
    // Also adjust some state if user is just entering the policy list view
    if (isCurrentlyOnListPage) {
      if (!wasPreviouslyOnListPage) {
        newState.apiError = undefined;
        newState.isLoading = true;
      }
      return newState;
    }
    return {
      ...initialPolicyListState(),
    };
  }

  return state;
};
