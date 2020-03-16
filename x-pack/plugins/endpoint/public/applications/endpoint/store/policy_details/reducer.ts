/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Reducer } from 'redux';
import { PolicyDetailsState } from '../../types';
import { AppAction } from '../action';

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
