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

    // If user just landed on the List page, then set the loading flag (data is being fetched)
    if (isCurrentlyOnListPage && !wasPreviouslyOnListPage) {
      newState.apiError = undefined;
      newState.isLoading = true;
      return newState;
    }
    return {
      ...initialPolicyListState(),
      location: action.payload,
    };
  }

  // FIXME: PT remove this
  if (action.type === 'userNavigatedFromPage' && action.payload === 'policyListPage') {
    return initialPolicyListState();
  }

  return state;
};
