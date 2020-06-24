/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ManagementStoreGlobalNamespace, ManagementSubTab } from '../types';

// --[ ROUTING ]---------------------------------------------------------------------------
export const MANAGEMENT_ROUTING_ROOT_PATH = '';
export const MANAGEMENT_ROUTING_ENDPOINTS_PATH = `${MANAGEMENT_ROUTING_ROOT_PATH}/:tabName(${ManagementSubTab.endpoints})`;
export const MANAGEMENT_ROUTING_POLICIES_PATH = `${MANAGEMENT_ROUTING_ROOT_PATH}/:tabName(${ManagementSubTab.policies})`;
export const MANAGEMENT_ROUTING_POLICY_DETAILS_PATH = `${MANAGEMENT_ROUTING_ROOT_PATH}/:tabName(${ManagementSubTab.policies})/:policyId`;

// --[ STORE ]---------------------------------------------------------------------------
/** The SIEM global store namespace where the management state will be mounted */
export const MANAGEMENT_STORE_GLOBAL_NAMESPACE: ManagementStoreGlobalNamespace = 'management';
/** Namespace within the Management state where policy list state is maintained */
export const MANAGEMENT_STORE_POLICY_LIST_NAMESPACE = 'policyList';
/** Namespace within the Management state where policy details state is maintained */
export const MANAGEMENT_STORE_POLICY_DETAILS_NAMESPACE = 'policyDetails';
/** Namespace within the Management state where endpoints state is maintained */
export const MANAGEMENT_STORE_ENDPOINTS_NAMESPACE = 'endpoints';
