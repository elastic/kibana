/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CombinedState } from 'redux';
import type { SecurityPageName } from '../app/types';
import type { PolicyDetailsState } from './pages/policy/types';
import type { EndpointState } from './pages/endpoint_hosts/types';

/**
 * The type for the management store global namespace. Used mostly internally to reference
 * the type while defining more complex interfaces/types
 */
export type ManagementStoreGlobalNamespace = 'management';

export type ManagementState = CombinedState<{
  policyDetails: PolicyDetailsState;
  endpoints: EndpointState;
}>;

/**
 * The management list of sub-tabs. Changes to these will impact the Router routes.
 */
export enum AdministrationSubTab {
  endpoints = 'endpoints',
  policies = 'policy',
  trustedApps = 'trusted_apps',
  eventFilters = 'event_filters',
  hostIsolationExceptions = 'host_isolation_exceptions',
  blocklist = 'blocklist',
  responseActionsHistory = 'response_actions_history',
  protectionUpdates = 'protection_updates',
}

/**
 * The URL route params for the Management Policy List section
 */
export interface ManagementRoutePolicyListParams {
  pageName: SecurityPageName.administration;
  tabName: AdministrationSubTab.policies;
}

/**
 * The URL route params for the Management Policy Details section
 */
export interface ManagementRoutePolicyDetailsParams extends ManagementRoutePolicyListParams {
  policyId: string;
}
