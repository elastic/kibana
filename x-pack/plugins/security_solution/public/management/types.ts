/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CombinedState } from 'redux';
import { SecurityPageName } from '../app/types';
import { PolicyDetailsState } from './pages/policy/types';
import { EndpointState } from './pages/endpoint_hosts/types';
import { EventFiltersListPageState } from './pages/event_filters/types';

/**
 * The type for the management store global namespace. Used mostly internally to reference
 * the type while defining more complex interfaces/types
 */
export type ManagementStoreGlobalNamespace = 'management';

export type ManagementState = CombinedState<{
  policyDetails: PolicyDetailsState;
  endpoints: EndpointState;
  eventFilters: EventFiltersListPageState;
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

export interface ArtifactListPageLocation {
  page_index: number;
  page_size: number;
  show?: 'create' | 'edit';
  /** Used for editing. The ID of the selected trusted app */
  id?: string;
  filter: string;
  // A string with comma delimiter-ed list of included policy IDs
  included_policies: string;
}
