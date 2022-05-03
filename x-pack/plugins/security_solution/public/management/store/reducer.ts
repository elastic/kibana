/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { combineReducers } from 'redux';
import {
  policyDetailsReducer,
  initialPolicyDetailsState,
} from '../pages/policy/store/policy_details';
import {
  MANAGEMENT_STORE_ENDPOINTS_NAMESPACE,
  MANAGEMENT_STORE_POLICY_DETAILS_NAMESPACE,
  MANAGEMENT_STORE_EVENT_FILTERS_NAMESPACE,
} from '../common/constants';
import { ImmutableCombineReducers } from '../../common/store';
import { Immutable } from '../../../common/endpoint/types';
import { ManagementState } from '../types';
import { endpointListReducer } from '../pages/endpoint_hosts/store/reducer';
import { initialEventFiltersPageState } from '../pages/event_filters/store/builders';
import { eventFiltersPageReducer } from '../pages/event_filters/store/reducer';
import { initialEndpointPageState } from '../pages/endpoint_hosts/store/builders';

const immutableCombineReducers: ImmutableCombineReducers = combineReducers;

/**
 * Returns the initial state of the store for the SIEM Management section
 */
export const mockManagementState: Immutable<ManagementState> = {
  [MANAGEMENT_STORE_POLICY_DETAILS_NAMESPACE]: initialPolicyDetailsState(),
  [MANAGEMENT_STORE_ENDPOINTS_NAMESPACE]: initialEndpointPageState(),
  [MANAGEMENT_STORE_EVENT_FILTERS_NAMESPACE]: initialEventFiltersPageState(),
};

/**
 * Redux store reducer for the SIEM Management section
 */
export const managementReducer = immutableCombineReducers({
  [MANAGEMENT_STORE_POLICY_DETAILS_NAMESPACE]: policyDetailsReducer,
  [MANAGEMENT_STORE_ENDPOINTS_NAMESPACE]: endpointListReducer,
  [MANAGEMENT_STORE_EVENT_FILTERS_NAMESPACE]: eventFiltersPageReducer,
});
