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
    policyItem: undefined,
    isLoading: false,
    agentStatusSummary: {
      error: 0,
      events: 0,
      offline: 0,
      online: 0,
      total: 0,
    },
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

  if (action.type === 'serverReturnedPolicyDetailsAgentSummaryData') {
    return {
      ...state,
      ...action.payload,
    };
  }

  if (action.type === 'serverReturnedPolicyDetailsUpdateFailure') {
    return {
      ...state,
      isLoading: false,
      updateApiError: action.payload,
    };
  }

  if (action.type === 'userClickedPolicyDetailsSaveButton') {
    return {
      ...state,
      isLoading: true,
      updateApiError: undefined,
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
