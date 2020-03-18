/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Reducer } from 'redux';
import { PolicyListState } from '../../types';
import { AppAction } from '../action';
import { selectApiError } from './selectors';

const initialPolicyListState = (): PolicyListState => {
  return {
    policyItems: [],
    isLoading: false,
    apiError: undefined,
    pageIndex: 0,
    pageSize: 10,
    total: 0,
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

  if (action.type === 'userShownPolicyListServerFailedMessage') {
    // Make sure that the apiError currently stored is the one the user was shown
    if (selectApiError(state) === action.payload) {
      return {
        ...state,
        apiError: undefined,
      };
    }
    return state;
  }

  if (
    action.type === 'userPaginatedPolicyListTable' ||
    (action.type === 'userNavigatedToPage' && action.payload === 'policyListPage')
  ) {
    return {
      ...state,
      isLoading: true,
    };
  }

  if (action.type === 'userNavigatedFromPage' && action.payload === 'policyListPage') {
    return initialPolicyListState();
  }

  return state;
};
