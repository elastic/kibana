/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ManagementStoreGlobalNamespace, AdministrationSubTab } from '../types';
import { APP_ID } from '../../../common/constants';
import { SecurityPageName } from '../../app/types';

// --[ ROUTING ]---------------------------------------------------------------------------
export const MANAGEMENT_APP_ID = `${APP_ID}:${SecurityPageName.administration}`;
export const MANAGEMENT_ROUTING_ROOT_PATH = '';
export const MANAGEMENT_ROUTING_ENDPOINTS_PATH = `${MANAGEMENT_ROUTING_ROOT_PATH}/:tabName(${AdministrationSubTab.endpoints})`;
export const MANAGEMENT_ROUTING_POLICIES_PATH = `${MANAGEMENT_ROUTING_ROOT_PATH}/:tabName(${AdministrationSubTab.policies})`;
export const MANAGEMENT_ROUTING_POLICY_DETAILS_PATH = `${MANAGEMENT_ROUTING_ROOT_PATH}/:tabName(${AdministrationSubTab.policies})/:policyId`;
export const MANAGEMENT_ROUTING_TRUSTED_APPS_PATH = `${MANAGEMENT_ROUTING_ROOT_PATH}/:tabName(${AdministrationSubTab.trustedApps})`;

// --[ STORE ]---------------------------------------------------------------------------
/** The SIEM global store namespace where the management state will be mounted */
export const MANAGEMENT_STORE_GLOBAL_NAMESPACE: ManagementStoreGlobalNamespace = 'management';
/** Namespace within the Management state where policy details state is maintained */
export const MANAGEMENT_STORE_POLICY_DETAILS_NAMESPACE = 'policyDetails';
/** Namespace within the Management state where endpoint-host state is maintained */
export const MANAGEMENT_STORE_ENDPOINTS_NAMESPACE = 'endpoints';
/** Namespace within the Management state where trusted apps page state is maintained */
export const MANAGEMENT_STORE_TRUSTED_APPS_NAMESPACE = 'trustedApps';

export const MANAGEMENT_PAGE_SIZE_OPTIONS: readonly number[] = [10, 20, 50];
export const MANAGEMENT_DEFAULT_PAGE = 0;
export const MANAGEMENT_DEFAULT_PAGE_SIZE = 10;

// --[ DEFAULTS ]---------------------------------------------------------------------------
/** The default polling interval to start all polling pages */
export const DEFAULT_POLL_INTERVAL = 10000;
