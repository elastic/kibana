/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Immutable } from '../../common/endpoint/types';
import { PolicyDetailsState, PolicyListState } from './pages/policy/types';
import { ImmutableReducer } from '../common/store';
import { AppAction } from '../common/store/actions';

/**
 * Redux store state for the Management section
 */
export type ManagementState = Immutable<{
  policyDetails: Immutable<PolicyDetailsState>;
  policyList: Immutable<PolicyListState>;
}>;

export interface ManagementPluginState {
  management: ManagementState;
}

export interface ManagementPluginReducer {
  management: ImmutableReducer<ManagementState, AppAction>;
}
