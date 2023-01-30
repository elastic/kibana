/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stringify } from 'query-string';

export type StaticPage =
  | 'base'
  | 'overview'
  | 'integrations'
  | 'policies'
  | 'policies_list'
  | 'enrollment_tokens'
  | 'data_streams'
  | 'settings'
  | 'settings_create_outputs'
  | 'settings_create_download_sources'
  | 'settings_create_fleet_server_hosts'
  | 'settings_create_fleet_proxy'
  | 'debug';

export type DynamicPage =
  | 'integrations_all'
  | 'integrations_installed'
  | 'integrations_installed_updates_available'
  | 'integration_details_overview'
  | 'integration_details_policies'
  | 'integration_details_assets'
  | 'integration_details_settings'
  | 'integration_details_custom'
  | 'integration_details_language_clients'
  | 'integration_details_api_reference'
  | 'integration_policy_edit'
  | 'integration_policy_upgrade'
  | 'policy_details'
  | 'add_integration_to_policy'
  | 'edit_integration'
  | 'upgrade_package_policy'
  | 'agent_list'
  | 'agent_details'
  | 'agent_details_logs'
  | 'agent_details_diagnostics'
  | 'settings_edit_outputs'
  | 'settings_edit_download_sources'
  | 'settings_edit_fleet_server_hosts'
  | 'settings_edit_fleet_proxy';

export type Page = StaticPage | DynamicPage;

export interface DynamicPagePathValues {
  [key: string]: string | boolean;
}

export const FLEET_BASE_PATH = '/app/fleet';
export const INTEGRATIONS_BASE_PATH = '/app/integrations';

// If routing paths are changed here, please also check to see if
// `pagePathGetters()`, below, needs any modifications
export const FLEET_ROUTING_PATHS = {
  fleet: '/:tabId',
  agents: '/agents',
  agent_details: '/agents/:agentId/:tabId?',
  agent_details_logs: '/agents/:agentId/logs',
  agent_details_diagnostics: '/agents/:agentId/diagnostics',
  policies: '/policies',
  policies_list: '/policies',
  policy_details: '/policies/:policyId/:tabId?',
  policy_details_settings: '/policies/:policyId/settings',
  edit_integration: '/policies/:policyId/edit-integration/:packagePolicyId',
  upgrade_package_policy: '/policies/:policyId/upgrade-package-policy/:packagePolicyId',
  enrollment_tokens: '/enrollment-tokens',
  data_streams: '/data-streams',
  settings: '/settings',
  settings_create_fleet_server_hosts: '/settings/create-fleet-server-hosts',
  settings_edit_fleet_server_hosts: '/settings/fleet-server-hosts/:itemId',
  settings_create_outputs: '/settings/create-outputs',
  settings_edit_outputs: '/settings/outputs/:outputId',
  settings_create_download_sources: '/settings/create-download-sources',
  settings_create_fleet_proxy: '/settings/create-fleet-proxy',
  settings_edit_fleet_proxy: '/settings/fleet-proxies/:itemId',
  settings_edit_download_sources: '/settings/downloadSources/:downloadSourceId',
  debug: '/_debug',

  // TODO: Move this to the integrations app
  add_integration_to_policy: '/integrations/:pkgkey/add-integration/:integration?',
};

export const INTEGRATIONS_SEARCH_QUERYPARAM = 'q';
export const INTEGRATIONS_ROUTING_PATHS = {
  integrations: '/:tabId',
  integrations_all: '/browse/:category?/:subcategory?',
  integrations_installed: '/installed/:category?',
  integrations_installed_updates_available: '/installed/updates_available/:category?',
  integration_details: '/detail/:pkgkey/:panel?',
  integration_details_overview: '/detail/:pkgkey/overview',
  integration_details_policies: '/detail/:pkgkey/policies',
  integration_details_assets: '/detail/:pkgkey/assets',
  integration_details_settings: '/detail/:pkgkey/settings',
  integration_details_custom: '/detail/:pkgkey/custom',
  integration_details_api_reference: '/detail/:pkgkey/api-reference',
  integration_details_language_clients: '/language_clients/:pkgkey/overview',
  integration_policy_edit: '/edit-integration/:packagePolicyId',
  integration_policy_upgrade: '/edit-integration/:packagePolicyId',
};

export const pagePathGetters: {
  [key in StaticPage]: () => [string, string];
} & {
  [key in DynamicPage]: (values: DynamicPagePathValues) => [string, string];
} = {
  base: () => [FLEET_BASE_PATH, '/'],
  overview: () => [FLEET_BASE_PATH, '/'],
  integrations: () => [INTEGRATIONS_BASE_PATH, '/'],
  integrations_all: ({
    searchTerm,
    category,
    subCategory,
  }: {
    searchTerm?: string;
    category?: string;
    subCategory?: string;
  }) => {
    const categoryPath =
      category && subCategory
        ? `/${category}/${subCategory} `
        : category && !subCategory
        ? `/${category}`
        : ``;
    const queryParams = searchTerm ? `?${INTEGRATIONS_SEARCH_QUERYPARAM}=${searchTerm}` : ``;
    return [INTEGRATIONS_BASE_PATH, `/browse${categoryPath}${queryParams}`];
  },
  integrations_installed: ({ query, category }: { query?: string; category?: string }) => {
    const categoryPath = category ? `/${category}` : ``;
    const queryParams = query ? `?${INTEGRATIONS_SEARCH_QUERYPARAM}=${query}` : ``;
    return [INTEGRATIONS_BASE_PATH, `/installed${categoryPath}${queryParams}`];
  },
  integrations_installed_updates_available: ({
    query,
    category,
  }: {
    query?: string;
    category?: string;
  }) => {
    const categoryPath = category ? `/${category}` : ``;
    const queryParams = query ? `?${INTEGRATIONS_SEARCH_QUERYPARAM}=${query}` : ``;
    return [INTEGRATIONS_BASE_PATH, `/installed/updates_available${categoryPath}${queryParams}`];
  },
  integration_details_overview: ({ pkgkey, integration }) => [
    INTEGRATIONS_BASE_PATH,
    `/detail/${pkgkey}/overview${integration ? `?integration=${integration}` : ''}`,
  ],
  integration_details_policies: ({ pkgkey, integration, addAgentToPolicyId }) => {
    const qs = stringify({ integration, addAgentToPolicyId });
    return [INTEGRATIONS_BASE_PATH, `/detail/${pkgkey}/policies${qs ? `?${qs}` : ''}`];
  },
  integration_details_assets: ({ pkgkey, integration }) => [
    INTEGRATIONS_BASE_PATH,
    `/detail/${pkgkey}/assets${integration ? `?integration=${integration}` : ''}`,
  ],
  integration_details_settings: ({ pkgkey, integration }) => [
    INTEGRATIONS_BASE_PATH,
    `/detail/${pkgkey}/settings${integration ? `?integration=${integration}` : ''}`,
  ],
  integration_details_custom: ({ pkgkey, integration }) => [
    INTEGRATIONS_BASE_PATH,
    `/detail/${pkgkey}/custom${integration ? `?integration=${integration}` : ''}`,
  ],
  integration_details_api_reference: ({ pkgkey, integration }) => [
    INTEGRATIONS_BASE_PATH,
    `/detail/${pkgkey}/api-reference${integration ? `?integration=${integration}` : ''}`,
  ],
  integration_policy_edit: ({ packagePolicyId }) => [
    INTEGRATIONS_BASE_PATH,
    `/edit-integration/${packagePolicyId}`,
  ],
  // Upgrades happen on the same edit form, just with a flag set. Separate page record here
  // allows us to set different breadcrumbs for upgrades when needed.
  integration_policy_upgrade: ({ packagePolicyId }) => [
    INTEGRATIONS_BASE_PATH,
    `/edit-integration/${packagePolicyId}`,
  ],
  // This route allows rendering custom language integration pages registered in the language_client plugin
  integration_details_language_clients: ({ pkgkey }) => [
    INTEGRATIONS_BASE_PATH,
    `/language_clients/${pkgkey}/overview`,
  ],
  policies: () => [FLEET_BASE_PATH, '/policies'],
  policies_list: () => [FLEET_BASE_PATH, '/policies'],
  policy_details: ({ policyId, tabId }) => [
    FLEET_BASE_PATH,
    `/policies/${policyId}${tabId ? `/${tabId}` : ''}`,
  ],
  add_integration_to_policy: ({ pkgkey, integration, agentPolicyId, useMultiPageLayout }) => {
    const qs = stringify({
      ...(agentPolicyId ? { policyId: agentPolicyId } : {}),
      ...(useMultiPageLayout ? { useMultiPageLayout: null } : {}),
    });
    return [
      FLEET_BASE_PATH,
      // prettier-ignore
      `/integrations/${pkgkey}/add-integration${integration ? `/${integration}` : ''}${qs ? `?${qs}` : ''}`,
    ];
  },
  edit_integration: ({ policyId, packagePolicyId }) => [
    FLEET_BASE_PATH,
    `/policies/${policyId}/edit-integration/${packagePolicyId}`,
  ],
  upgrade_package_policy: ({ policyId, packagePolicyId }) => [
    FLEET_BASE_PATH,
    `/policies/${policyId}/upgrade-package-policy/${packagePolicyId}`,
  ],
  agent_list: ({ kuery }) => [FLEET_BASE_PATH, `/agents${kuery ? `?kuery=${kuery}` : ''}`],
  agent_details: ({ agentId, tabId, logQuery }) => [
    FLEET_BASE_PATH,
    `/agents/${agentId}${tabId ? `/${tabId}` : ''}${logQuery ? `?_q=${logQuery}` : ''}`,
  ],
  agent_details_logs: ({ agentId }) => [FLEET_BASE_PATH, `/agents/${agentId}/logs`],
  agent_details_diagnostics: ({ agentId }) => [FLEET_BASE_PATH, `/agents/${agentId}/diagnostics`],
  enrollment_tokens: () => [FLEET_BASE_PATH, '/enrollment-tokens'],
  data_streams: () => [FLEET_BASE_PATH, '/data-streams'],
  settings: () => [FLEET_BASE_PATH, FLEET_ROUTING_PATHS.settings],
  settings_edit_fleet_server_hosts: ({ itemId }) => [
    FLEET_BASE_PATH,
    FLEET_ROUTING_PATHS.settings_edit_fleet_server_hosts.replace(':itemId', itemId.toString()),
  ],
  settings_create_fleet_server_hosts: () => [
    FLEET_BASE_PATH,
    FLEET_ROUTING_PATHS.settings_create_fleet_server_hosts,
  ],
  settings_create_fleet_proxy: () => [
    FLEET_BASE_PATH,
    FLEET_ROUTING_PATHS.settings_create_fleet_proxy,
  ],
  settings_edit_fleet_proxy: ({ itemId }) => [
    FLEET_BASE_PATH,
    FLEET_ROUTING_PATHS.settings_edit_fleet_proxy.replace(':itemId', itemId.toString()),
  ],
  settings_edit_outputs: ({ outputId }) => [
    FLEET_BASE_PATH,
    FLEET_ROUTING_PATHS.settings_edit_outputs.replace(':outputId', outputId as string),
  ],
  settings_edit_download_sources: ({ downloadSourceId }) => [
    FLEET_BASE_PATH,
    FLEET_ROUTING_PATHS.settings_edit_download_sources.replace(
      ':downloadSourceId',
      downloadSourceId as string
    ),
  ],
  settings_create_outputs: () => [FLEET_BASE_PATH, FLEET_ROUTING_PATHS.settings_create_outputs],
  settings_create_download_sources: () => [
    FLEET_BASE_PATH,
    FLEET_ROUTING_PATHS.settings_create_download_sources,
  ],
  debug: () => [FLEET_BASE_PATH, FLEET_ROUTING_PATHS.debug],
};
