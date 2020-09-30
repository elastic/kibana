/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export type StaticPage =
  | 'overview'
  | 'integrations'
  | 'integrations_all'
  | 'integrations_installed'
  | 'policies'
  | 'policies_list'
  | 'fleet'
  | 'fleet_enrollment_tokens'
  | 'data_streams';

export type DynamicPage =
  | 'integration_details'
  | 'policy_details'
  | 'add_integration_from_policy'
  | 'add_integration_to_policy'
  | 'edit_integration'
  | 'fleet_agent_list'
  | 'fleet_agent_details';

export type Page = StaticPage | DynamicPage;

export interface DynamicPagePathValues {
  [key: string]: string;
}

export const BASE_PATH = '/app/ingestManager';

// If routing paths are changed here, please also check to see if
// `pagePathGetters()`, below, needs any modifications
export const PAGE_ROUTING_PATHS = {
  overview: '/',
  integrations: '/integrations/:tabId?',
  integrations_all: '/integrations',
  integrations_installed: '/integrations/installed',
  integration_details: '/integrations/detail/:pkgkey/:panel?',
  policies: '/policies',
  policies_list: '/policies',
  policy_details: '/policies/:policyId/:tabId?',
  policy_details_settings: '/policies/:policyId/settings',
  add_integration_from_policy: '/policies/:policyId/add-integration',
  add_integration_to_policy: '/integrations/:pkgkey/add-integration',
  edit_integration: '/policies/:policyId/edit-integration/:packagePolicyId',
  fleet: '/fleet',
  fleet_agent_list: '/fleet/agents',
  fleet_agent_details: '/fleet/agents/:agentId/:tabId?',
  fleet_agent_details_events: '/fleet/agents/:agentId',
  fleet_agent_details_details: '/fleet/agents/:agentId/details',
  fleet_enrollment_tokens: '/fleet/enrollment-tokens',
  data_streams: '/data-streams',
};

export const pagePathGetters: {
  [key in StaticPage]: () => string;
} &
  {
    [key in DynamicPage]: (values: DynamicPagePathValues) => string;
  } = {
  overview: () => '/',
  integrations: () => '/integrations',
  integrations_all: () => '/integrations',
  integrations_installed: () => '/integrations/installed',
  integration_details: ({ pkgkey, panel }) =>
    `/integrations/detail/${pkgkey}${panel ? `/${panel}` : ''}`,
  policies: () => '/policies',
  policies_list: () => '/policies',
  policy_details: ({ policyId, tabId }) => `/policies/${policyId}${tabId ? `/${tabId}` : ''}`,
  add_integration_from_policy: ({ policyId }) => `/policies/${policyId}/add-integration`,
  add_integration_to_policy: ({ pkgkey }) => `/integrations/${pkgkey}/add-integration`,
  edit_integration: ({ policyId, packagePolicyId }) =>
    `/policies/${policyId}/edit-integration/${packagePolicyId}`,
  fleet: () => '/fleet',
  fleet_agent_list: ({ kuery }) => `/fleet/agents${kuery ? `?kuery=${kuery}` : ''}`,
  fleet_agent_details: ({ agentId, tabId }) =>
    `/fleet/agents/${agentId}${tabId ? `/${tabId}` : ''}`,
  fleet_enrollment_tokens: () => '/fleet/enrollment-tokens',
  data_streams: () => '/data-streams',
};
