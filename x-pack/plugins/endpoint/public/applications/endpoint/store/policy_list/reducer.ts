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
    pageIndex: 0,
    pageSize: 10,
    total: 0,
    isOnPage: false,
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

  if (action.type === 'userChangedUrl' && action.payload.pathname === '/policy') {
    return {
      ...state,
      isLoading: true,
      isOnPage: true,
    };
  }

  if (action.type === 'userChangedUrl' && isOnPolicyListPage(state)) {
    return initialPolicyListState();
  }

  return state;
};
