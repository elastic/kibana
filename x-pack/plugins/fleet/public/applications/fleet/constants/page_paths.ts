/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type StaticPage =
  | 'base'
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
  | 'integration_details_overview'
  | 'integration_details_policies'
  | 'integration_details_settings'
  | 'integration_details_custom'
  | 'integration_policy_edit'
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

export const BASE_PATH = '/app/fleet';

// If routing paths are changed here, please also check to see if
// `pagePathGetters()`, below, needs any modifications
export const PAGE_ROUTING_PATHS = {
  overview: '/',
  integrations: '/integrations/:tabId?',
  integrations_all: '/integrations',
  integrations_installed: '/integrations/installed',
  integration_details: '/integrations/detail/:pkgkey/:panel?',
  integration_details_overview: '/integrations/detail/:pkgkey/overview',
  integration_details_policies: '/integrations/detail/:pkgkey/policies',
  integration_details_settings: '/integrations/detail/:pkgkey/settings',
  integration_details_custom: '/integrations/detail/:pkgkey/custom',
  integration_policy_edit: '/integrations/edit-integration/:packagePolicyId',
  policies: '/policies',
  policies_list: '/policies',
  policy_details: '/policies/:policyId/:tabId?',
  policy_details_settings: '/policies/:policyId/settings',
  add_integration_from_policy: '/policies/:policyId/add-integration',
  add_integration_to_policy: '/integrations/:pkgkey/add-integration/:integration?',
  edit_integration: '/policies/:policyId/edit-integration/:packagePolicyId',
  fleet: '/fleet',
  fleet_agent_list: '/fleet/agents',
  fleet_agent_details: '/fleet/agents/:agentId/:tabId?',
  fleet_agent_details_logs: '/fleet/agents/:agentId/logs',
  fleet_enrollment_tokens: '/fleet/enrollment-tokens',
  data_streams: '/data-streams',
};

export const pagePathGetters: {
  [key in StaticPage]: () => string;
} &
  {
    [key in DynamicPage]: (values: DynamicPagePathValues) => string;
  } = {
  base: () => '/',
  overview: () => '/',
  integrations: () => '/integrations',
  integrations_all: () => '/integrations',
  integrations_installed: () => '/integrations/installed',
  integration_details_overview: ({ pkgkey, integration }) =>
    `/integrations/detail/${pkgkey}/overview${integration ? `?integration=${integration}` : ''}`,
  integration_details_policies: ({ pkgkey, integration }) =>
    `/integrations/detail/${pkgkey}/policies${integration ? `?integration=${integration}` : ''}`,
  integration_details_settings: ({ pkgkey, integration }) =>
    `/integrations/detail/${pkgkey}/settings${integration ? `?integration=${integration}` : ''}`,
  integration_details_custom: ({ pkgkey, integration }) =>
    `/integrations/detail/${pkgkey}/custom${integration ? `?integration=${integration}` : ''}`,
  integration_policy_edit: ({ packagePolicyId }) =>
    `/integrations/edit-integration/${packagePolicyId}`,
  policies: () => '/policies',
  policies_list: () => '/policies',
  policy_details: ({ policyId, tabId }) => `/policies/${policyId}${tabId ? `/${tabId}` : ''}`,
  add_integration_from_policy: ({ policyId }) => `/policies/${policyId}/add-integration`,
  add_integration_to_policy: ({ pkgkey, integration }) =>
    `/integrations/${pkgkey}/add-integration${integration ? `/${integration}` : ''}`,
  edit_integration: ({ policyId, packagePolicyId }) =>
    `/policies/${policyId}/edit-integration/${packagePolicyId}`,
  fleet: () => '/fleet',
  fleet_agent_list: ({ kuery }) => `/fleet/agents${kuery ? `?kuery=${kuery}` : ''}`,
  fleet_agent_details: ({ agentId, tabId, logQuery }) =>
    `/fleet/agents/${agentId}${tabId ? `/${tabId}` : ''}${logQuery ? `?_q=${logQuery}` : ''}`,
  fleet_enrollment_tokens: () => '/fleet/enrollment-tokens',
  data_streams: () => '/data-streams',
};
