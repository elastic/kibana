/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CombinedState } from 'redux';
import { SecurityPageName } from '../app/types';
import { PolicyListState, PolicyDetailsState } from './pages/policy/types';
import { HostState } from './pages/endpoint_hosts/types';

/**
 * The type for the management store global namespace. Used mostly internally to reference
 * the type while defining more complex interfaces/types
 */
export type ManagementStoreGlobalNamespace = 'management';

export type ManagementState = CombinedState<{
  policyList: PolicyListState;
  policyDetails: PolicyDetailsState;
  hosts: HostState;
}>;

/**
 * The management list of sub-tabs. Changes to these will impact the Router routes.
 */
export enum ManagementSubTab {
  hosts = 'hosts',
  policies = 'policy',
}

/**
 * The URL route params for the Management Policy List section
 */
export interface ManagementRoutePolicyListParams {
  pageName: SecurityPageName.management;
  tabName: ManagementSubTab.policies;
}

/**
 * The URL route params for the Management Policy Details section
 */
export interface ManagementRoutePolicyDetailsParams extends ManagementRoutePolicyListParams {
  policyId: string;
}
