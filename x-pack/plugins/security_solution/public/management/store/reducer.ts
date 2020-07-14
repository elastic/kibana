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
  MANAGEMENT_STORE_HOSTS_NAMESPACE,
  MANAGEMENT_STORE_POLICY_DETAILS_NAMESPACE,
  MANAGEMENT_STORE_POLICY_LIST_NAMESPACE,
} from '../common/constants';
import { ImmutableCombineReducers } from '../../common/store';
import { Immutable } from '../../../common/endpoint/types';
import { ManagementState } from '../types';
import { hostListReducer, initialHostListState } from '../pages/endpoint_hosts/store/reducer';

const immutableCombineReducers: ImmutableCombineReducers = combineReducers;

/**
 * Returns the initial state of the store for the SIEM Management section
 */
export const mockManagementState: Immutable<ManagementState> = {
  [MANAGEMENT_STORE_POLICY_LIST_NAMESPACE]: initialPolicyListState(),
  [MANAGEMENT_STORE_POLICY_DETAILS_NAMESPACE]: initialPolicyDetailsState(),
  [MANAGEMENT_STORE_HOSTS_NAMESPACE]: initialHostListState,
};

/**
 * Redux store reducer for the SIEM Management section
 */
export const managementReducer = immutableCombineReducers({
  [MANAGEMENT_STORE_POLICY_LIST_NAMESPACE]: policyListReducer,
  [MANAGEMENT_STORE_POLICY_DETAILS_NAMESPACE]: policyDetailsReducer,
  [MANAGEMENT_STORE_HOSTS_NAMESPACE]: hostListReducer,
});
