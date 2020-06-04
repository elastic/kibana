/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { combineReducers } from 'redux';
import {
  policyDetailsReducer,
  initialPolicyDetailsState,
} from '../pages/policy/store/policy_details/reducer';
import {
  policyListReducer,
  initialPolicyListState,
} from '../pages/policy/store/policy_list/reducer';
import {
  MANAGEMENT_STORE_POLICY_DETAILS_NAMESPACE,
  MANAGEMENT_STORE_POLICY_LIST_NAMESPACE,
} from '../common/constants';
import { ImmutableCombineReducers } from '../../common/store';
import { Immutable } from '../../../common/endpoint/types';
import { ManagementState } from '../types';

const immutableCombineReducers: ImmutableCombineReducers = combineReducers;

export const mockManagementState: Immutable<ManagementState> = {
  policyList: initialPolicyListState(),
  policyDetails: initialPolicyDetailsState(),
};

/**
 * Redux store reducer for the SIEM Management section
 */
export const managementReducer = immutableCombineReducers({
  [MANAGEMENT_STORE_POLICY_LIST_NAMESPACE]: policyListReducer,
  [MANAGEMENT_STORE_POLICY_DETAILS_NAMESPACE]: policyDetailsReducer,
});
