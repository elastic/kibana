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

export const FLEET_BASE_PATH = '/app/fleet';
export const INTEGRATIONS_BASE_PATH = '/app/integrations';

// If routing paths are changed here, please also check to see if
// `pagePathGetters()`, below, needs any modifications
export const FLEET_ROUTING_PATHS = {
  overview: '/',
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

export const INTEGRATIONS_ROUTING_PATHS = {
  integrations: '/:tabId',
  integrations_all: '/browse',
  integrations_installed: '/installed',
  integration_details: '/detail/:pkgkey/:panel?',
  integration_details_overview: '/detail/:pkgkey/overview',
  integration_details_policies: '/detail/:pkgkey/policies',
  integration_details_settings: '/detail/:pkgkey/settings',
  integration_details_custom: '/detail/:pkgkey/custom',
  integration_policy_edit: '/edit-integration/:packagePolicyId',
};

export const pagePathGetters: {
  [key in StaticPage]: () => [string, string];
} &
  {
    [key in DynamicPage]: (values: DynamicPagePathValues) => [string, string];
  } = {
  base: () => [FLEET_BASE_PATH, '/'],
  overview: () => [FLEET_BASE_PATH, '/'],
  integrations: () => [INTEGRATIONS_BASE_PATH, '/'],
  integrations_all: () => [INTEGRATIONS_BASE_PATH, '/browse'],
  integrations_installed: () => [INTEGRATIONS_BASE_PATH, '/installed'],
  integration_details_overview: ({ pkgkey, integration }) => [
    INTEGRATIONS_BASE_PATH,
    `/detail/${pkgkey}/overview${integration ? `?integration=${integration}` : ''}`,
  ],
  integration_details_policies: ({ pkgkey, integration }) => [
    INTEGRATIONS_BASE_PATH,
    `/detail/${pkgkey}/policies${integration ? `?integration=${integration}` : ''}`,
  ],
  integration_details_settings: ({ pkgkey, integration }) => [
    INTEGRATIONS_BASE_PATH,
    `/detail/${pkgkey}/settings${integration ? `?integration=${integration}` : ''}`,
  ],
  integration_details_custom: ({ pkgkey, integration }) => [
    INTEGRATIONS_BASE_PATH,
    `/detail/${pkgkey}/custom${integration ? `?integration=${integration}` : ''}`,
  ],
  integration_policy_edit: ({ packagePolicyId }) => [
    INTEGRATIONS_BASE_PATH,
    `/edit-integration/${packagePolicyId}`,
  ],
  policies: () => [FLEET_BASE_PATH, '/policies'],
  policies_list: () => [FLEET_BASE_PATH, '/policies'],
  policy_details: ({ policyId, tabId }) => [
    FLEET_BASE_PATH,
    `/policies/${policyId}${tabId ? `/${tabId}` : ''}`,
  ],
  add_integration_from_policy: ({ policyId }) => [
    FLEET_BASE_PATH,
    `/policies/${policyId}/add-integration`,
  ],
  add_integration_to_policy: ({ pkgkey, integration, agentPolicyId }) => [
    FLEET_BASE_PATH,
    // prettier-ignore
    `/integrations/${pkgkey}/add-integration${integration ? `/${integration}` : ''}${agentPolicyId ? `?policyId=${agentPolicyId}` : ''}`,
  ],
  edit_integration: ({ policyId, packagePolicyId }) => [
    FLEET_BASE_PATH,
    `/policies/${policyId}/edit-integration/${packagePolicyId}`,
  ],
  fleet: () => [FLEET_BASE_PATH, '/fleet'],
  fleet_agent_list: ({ kuery }) => [
    FLEET_BASE_PATH,
    `/fleet/agents${kuery ? `?kuery=${kuery}` : ''}`,
  ],
  fleet_agent_details: ({ agentId, tabId, logQuery }) => [
    FLEET_BASE_PATH,
    `/fleet/agents/${agentId}${tabId ? `/${tabId}` : ''}${logQuery ? `?_q=${logQuery}` : ''}`,
  ],
  fleet_enrollment_tokens: () => [FLEET_BASE_PATH, '/fleet/enrollment-tokens'],
  data_streams: () => [FLEET_BASE_PATH, '/data-streams'],
};
