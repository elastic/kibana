/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { combineReducers } from 'redux';
import { ManagementState } from '../types';
import {
  initialPolicyDetailsState,
  policyDetailsReducer,
} from '../pages/policy/store/policy_details/reducer';
import {
  initialPolicyListState,
  policyListReducer,
} from '../pages/policy/store/policy_list/reducer';
import {
  MANAGEMENT_STORE_POLICY_DETAILS_NAMESPACE,
  MANAGEMENT_STORE_POLICY_LIST_NAMESPACE,
} from './constants';

/**
 * Returns the initial state of the store for the SIEM Management section
 */
export const getManagementInitialState = (): ManagementState => {
  return {
    [MANAGEMENT_STORE_POLICY_LIST_NAMESPACE]: initialPolicyListState(),
    [MANAGEMENT_STORE_POLICY_DETAILS_NAMESPACE]: initialPolicyDetailsState(),
  };
};

/**
 * Redux store reducer for the SIEM Management section
 */
export const managementReducer = combineReducers<ManagementState>({
  [MANAGEMENT_STORE_POLICY_LIST_NAMESPACE]: policyListReducer,
  [MANAGEMENT_STORE_POLICY_DETAILS_NAMESPACE]: policyDetailsReducer,
});
