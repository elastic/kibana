/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Reducer } from 'redux';
import { PolicyConfig, PolicyDetailsState } from '../../types';
import { AppAction } from '../action';
import { fullPolicy, isOnPolicyDetailsPage } from './selectors';

const initialPolicyDetailsState = (): PolicyDetailsState => {
  return {
    policyItem: undefined,
    policyConfig: undefined,
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
  if (
    action.type === 'serverReturnedPolicyDetailsData' ||
    action.type === 'serverReturnedUpdatedPolicyDetailsData'
  ) {
    return {
      ...state,
      ...action.payload,
      isLoading: false,
    };
  }

  if (action.type === 'serverFailedToReturnPolicyDetailsData') {
    return {
      ...state,
      isLoading: false,
      apiError: action.payload,
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
      updateStatus: action.payload,
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
    const newState = {
      ...state,
      location: action.payload,
    };

    if (isOnPolicyDetailsPage(newState)) {
      return newState;
    }
    return {
      ...initialPolicyDetailsState(),
      location: action.payload,
    };
  }

  if (action.type === 'userChangedPolicyConfig') {
    const newState = { ...state };
    const { windows, linux, mac } = fullPolicy(state) as PolicyConfig;
    newState.policyItem!.inputs[0].config.policy.value = {
      windows: {
        ...windows,
        ...action.payload.policyConfig.windows,
      },
      mac: {
        ...mac,
        ...action.payload.policyConfig.mac,
      },
      linux: {
        ...linux,
        ...action.payload.policyConfig.linux,
      },
    };
    return newState;
  }

  return state;
};
