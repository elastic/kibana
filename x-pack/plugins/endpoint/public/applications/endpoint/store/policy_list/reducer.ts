/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Reducer } from 'redux';
import { PolicyListState, PolicyDetailsState } from '../../types';
import { AppAction } from '../action';

const initialPolicyListState = (): PolicyListState => {
  return {
    policyItems: [],
    isLoading: false,
    pageIndex: 0,
    pageSize: 10,
    total: 0,
  };
};

const initialPolicyDetailsState = (): PolicyDetailsState => {
  return {
    policyItem: {
      name: '',
      total: 0,
      pending: 0,
      failed: 0,
      id: '',
      created_by: '',
      created: '',
      updated_by: '',
      updated: '',
    },
    isLoading: false,
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

export const policyDetailsReducer: Reducer<PolicyDetailsState, AppAction> = (
  state = initialPolicyDetailsState(),
  action
) => {
  if (action.type === 'serverReturnedPolicyDetailsData') {
    return {
      ...state,
      ...action.payload,
      isLoading: false,
    };
  }

  if (action.type === 'userChangedUrl') {
    return {
      ...state,
      location: action.payload,
    };
  }

  return state;
};
