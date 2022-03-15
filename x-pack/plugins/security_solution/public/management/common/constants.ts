/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MANAGEMENT_PATH } from '../../../common/constants';
import { ManagementStoreGlobalNamespace, AdministrationSubTab } from '../types';

// --[ ROUTING ]---------------------------------------------------------------------------
export const MANAGEMENT_ROUTING_ENDPOINTS_PATH = `${MANAGEMENT_PATH}/:tabName(${AdministrationSubTab.endpoints})`;
export const MANAGEMENT_ROUTING_POLICIES_PATH = `${MANAGEMENT_PATH}/:tabName(${AdministrationSubTab.policies})`;
export const MANAGEMENT_ROUTING_POLICY_DETAILS_FORM_PATH = `${MANAGEMENT_PATH}/:tabName(${AdministrationSubTab.policies})/:policyId/settings`;
export const MANAGEMENT_ROUTING_POLICY_DETAILS_TRUSTED_APPS_PATH = `${MANAGEMENT_PATH}/:tabName(${AdministrationSubTab.policies})/:policyId/trustedApps`;
export const MANAGEMENT_ROUTING_POLICY_DETAILS_EVENT_FILTERS_PATH = `${MANAGEMENT_PATH}/:tabName(${AdministrationSubTab.policies})/:policyId/eventFilters`;
export const MANAGEMENT_ROUTING_POLICY_DETAILS_HOST_ISOLATION_EXCEPTIONS_PATH = `${MANAGEMENT_PATH}/:tabName(${AdministrationSubTab.policies})/:policyId/hostIsolationExceptions`;
export const MANAGEMENT_ROUTING_POLICY_DETAILS_BLOCKLISTS_PATH = `${MANAGEMENT_PATH}/:tabName(${AdministrationSubTab.policies})/:policyId/blocklists`;
/** @deprecated use the paths defined above instead */
export const MANAGEMENT_ROUTING_POLICY_DETAILS_PATH_OLD = `${MANAGEMENT_PATH}/:tabName(${AdministrationSubTab.policies})/:policyId`;
export const MANAGEMENT_ROUTING_TRUSTED_APPS_PATH = `${MANAGEMENT_PATH}/:tabName(${AdministrationSubTab.trustedApps})`;
export const MANAGEMENT_ROUTING_EVENT_FILTERS_PATH = `${MANAGEMENT_PATH}/:tabName(${AdministrationSubTab.eventFilters})`;
export const MANAGEMENT_ROUTING_HOST_ISOLATION_EXCEPTIONS_PATH = `${MANAGEMENT_PATH}/:tabName(${AdministrationSubTab.hostIsolationExceptions})`;
export const MANAGEMENT_ROUTING_BLOCKLIST_PATH = `${MANAGEMENT_PATH}/:tabName(${AdministrationSubTab.blocklist})`;

// --[ STORE ]---------------------------------------------------------------------------
/** The SIEM global store namespace where the management state will be mounted */
export const MANAGEMENT_STORE_GLOBAL_NAMESPACE: ManagementStoreGlobalNamespace = 'management';
/** Namespace within the Management state where policy details state is maintained */
export const MANAGEMENT_STORE_POLICY_DETAILS_NAMESPACE = 'policyDetails';
/** Namespace within the Management state where endpoint-host state is maintained */
export const MANAGEMENT_STORE_ENDPOINTS_NAMESPACE = 'endpoints';
/** Namespace within the Management state where trusted apps page state is maintained */
export const MANAGEMENT_STORE_TRUSTED_APPS_NAMESPACE = 'trustedApps';
/** Namespace within the Management state where event filters page state is maintained */
export const MANAGEMENT_STORE_EVENT_FILTERS_NAMESPACE = 'eventFilters';
export const MANAGEMENT_STORE_HOST_ISOLATION_EXCEPTIONS_NAMESPACE = 'hostIsolationExceptions';

export const MANAGEMENT_PAGE_SIZE_OPTIONS: readonly number[] = [10, 20, 50];
export const MANAGEMENT_DEFAULT_PAGE = 0;
export const MANAGEMENT_DEFAULT_PAGE_SIZE = 10;

// --[ DEFAULTS ]---------------------------------------------------------------------------
/** The default polling interval to start all polling pages */
export const DEFAULT_POLL_INTERVAL = 10000;
