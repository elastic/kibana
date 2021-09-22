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
import { isOnPolicyTrustedAppsView } from '../selectors/policy_common_selectors';
import { AssignedTrustedAppsListStateChanged } from '../action/policy_trusted_apps_action';
import { Immutable } from '../../../../../../../common/endpoint/types';

type ActionSpecificReducer<A extends AppAction = AppAction> = (
  state: Immutable<PolicyDetailsState>,
  action: Immutable<A>
) => Immutable<PolicyDetailsState>;

export const policyTrustedAppsReducer: ImmutableReducer<PolicyDetailsState, AppAction> = (
  state = initialPolicyDetailsState(),
  action
) => {
  // If not on the Trusted Apps Policy view, then just return
  if (!isOnPolicyTrustedAppsView(state)) {
    return state;
  }

  switch (action.type) {
    case 'assignedTrustedAppsListStateChanged':
      return handleAssignedTrustedAppsListStateChanged(state, action);
    default:
      return state;
  }
};

const handleAssignedTrustedAppsListStateChanged: ActionSpecificReducer<AssignedTrustedAppsListStateChanged> =
  (state, action) => {
    return {
      ...state,
      artifacts: {
        ...state?.artifacts,
        assignedList: action.payload,
      },
    };
  };
