/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ImmutableReducer } from '../../../../../../common/store';
import { PolicyDetailsState } from '../../../types';
import { AppAction } from '../../../../../../common/store/actions';
import { initialPolicyDetailsState } from './initial_policy_details_state';
import { isUninitialisedResourceState } from '../../../../../state';
import { getCurrentPolicyAssignedTrustedAppsState, isOnPolicyTrustedAppsView } from '../selectors';

export const policyTrustedAppsReducer: ImmutableReducer<PolicyDetailsState, AppAction> = (
  state = initialPolicyDetailsState(),
  action
) => {
  /* ----------------------------------------------------------
     If not on the Trusted Apps Policy view, then just return
     ---------------------------------------------------------- */
  if (!isOnPolicyTrustedAppsView(state)) {
    // If the artifacts state namespace needs resetting, then do it now
    if (!isUninitialisedResourceState(getCurrentPolicyAssignedTrustedAppsState(state))) {
      return {
        ...state,
        artifacts: initialPolicyDetailsState().artifacts,
      };
    }

    return state;
  }

  if (action.type === 'policyArtifactsAssignableListPageDataChanged') {
    return {
      ...state,
      artifacts: {
        ...state.artifacts,
        assignableList: action.payload,
      },
    };
  }

  if (action.type === 'policyArtifactsUpdateTrustedAppsChanged') {
    return {
      ...state,
      artifacts: {
        ...state.artifacts,
        trustedAppsToUpdate: action.payload,
      },
    };
  }

  if (action.type === 'policyArtifactsAssignableListExistDataChanged') {
    return {
      ...state,
      artifacts: {
        ...state.artifacts,
        assignableListEntriesExist: action.payload,
      },
    };
  }

  if (action.type === 'policyArtifactsDeosAnyTrustedAppExists') {
    return {
      ...state,
      artifacts: {
        ...state?.artifacts,
        doesAnyTrustedAppExists: action.payload,
      },
    };
  }
  if (action.type === 'assignedTrustedAppsListStateChanged') {
    return {
      ...state,
      artifacts: {
        ...state?.artifacts,
        assignedList: action.payload,
      },
    };
  }

  if (action.type === 'policyDetailsListOfAllPoliciesStateChanged') {
    return {
      ...state,
      artifacts: {
        ...state.artifacts,
        policies: action.payload,
      },
    };
  }

  return state;
};
