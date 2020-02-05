/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Reducer } from 'redux';
import { PolicyListState } from '../../types';
import { AppAction } from '../action';

const initialPolicyListState = (): PolicyListState => {
  return {
    policyItems: [],
    pageIndex: 0,
    pageSize: 0,
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
      policyItems: action.payload.policyItems,
    };
  }

  if (action.type === 'userPaginatedPolicyListTable') {
    return {
      ...state,
      ...action.payload,
    };
  }

  if (action.type === 'userNavigatedFromPage' && action.payload === 'policyListPage') {
    return initialPolicyListState();
  }

  return state;
};
