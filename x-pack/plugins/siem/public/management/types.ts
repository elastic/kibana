/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Immutable } from '../../common/endpoint/types';
import { PolicyDetailsState, PolicyListState } from './pages/policy/types';
import { ImmutableReducer } from '../common/store';
import { AppAction } from '../common/store/actions';
import { SiemPageName } from '../app/types';

/**
 * The type for the management store global namespace. Used mostly internally to reference
 * the type while defining more complex interfaces/types
 */
export type ManagementStoreGlobalNamespace = 'management';

/**
 * Redux store state for the Management section
 */
export interface ManagementState {
  policyDetails: Immutable<PolicyDetailsState>;
  policyList: Immutable<PolicyListState>;
}

export interface ManagementPluginState {
  management: ManagementState;
}

export interface ManagementPluginReducer {
  management: ImmutableReducer<ManagementState, AppAction>;
}

/**
 * The management list of sub-tabs. Changes to these will impact the Router routes.
 */
export enum ManagementSubTab {
  endpoints = 'endpoints',
  policies = 'policy',
}

/**
 * The URL route params for the Management Policy List section
 */
export interface ManagementRoutePolicyListParams {
  pageName: SiemPageName.management;
  tabName: ManagementSubTab.policies;
}

/**
 * The URL route params for the Management Policy Details section
 */
export interface ManagementRoutePolicyDetailsParams extends ManagementRoutePolicyListParams {
  policyId: string;
}
