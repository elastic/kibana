/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { fullPolicy, isOnPolicyDetailsPage } from './selectors';
import { Immutable, PolicyConfig, UIPolicyConfig } from '../../../../../../common/endpoint/types';
import { ImmutableReducer } from '../../../../../common/store';
import { AppAction } from '../../../../../common/store/actions';
import { PolicyDetailsState } from '../../types';

/**
 * Return a fresh copy of initial state, since we mutate state in the reducer.
 */
export const initialPolicyDetailsState: () => Immutable<PolicyDetailsState> = () => ({
  policyItem: undefined,
  isLoading: false,
  agentStatusSummary: {
    error: 0,
    events: 0,
    offline: 0,
    online: 0,
    total: 0,
    other: 0,
  },
});

export const policyDetailsReducer: ImmutableReducer<PolicyDetailsState, AppAction> = (
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
    const newState: Immutable<PolicyDetailsState> = {
      ...state,
      location: action.payload,
    };
    const isCurrentlyOnDetailsPage = isOnPolicyDetailsPage(newState);
    const wasPreviouslyOnDetailsPage = isOnPolicyDetailsPage(state);

    if (isCurrentlyOnDetailsPage) {
      // Did user just enter the Detail page? if so, then
      // set the loading indicator and return new state
      if (!wasPreviouslyOnDetailsPage) {
        return {
          ...newState,
          isLoading: true,
        };
      }
      // Else, user was already on the details page,
      // just return the updated state with new location data
      return newState;
    }

    return {
      ...initialPolicyDetailsState(),
      location: action.payload,
    };
  }

  if (action.type === 'userChangedPolicyConfig') {
    if (!state.policyItem) {
      return state;
    }
    const newState = { ...state, policyItem: { ...state.policyItem } };
    const newPolicy: PolicyConfig = { ...fullPolicy(state) };

    /**
     * This is directly changing redux state because `policyItem.inputs` was copied over and not cloned.
     */
    // @ts-ignore
    newState.policyItem.inputs[0].config.policy.value = newPolicy;

    Object.entries(action.payload.policyConfig).forEach(([section, newSettings]) => {
      /**
       * this is not safe because `action.payload.policyConfig` may have excess keys
       */
      // @ts-ignore
      newPolicy[section as keyof UIPolicyConfig] = {
        ...newPolicy[section as keyof UIPolicyConfig],
        ...newSettings,
      };
    });

    return newState;
  }

  return state;
};
