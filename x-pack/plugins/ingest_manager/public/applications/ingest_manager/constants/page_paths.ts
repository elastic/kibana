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
  | 'configurations'
  | 'configurations_list'
  | 'fleet'
  | 'fleet_enrollment_tokens'
  | 'data_streams';

export type DynamicPage =
  | 'integration_details'
  | 'configuration_details'
  | 'add_integration_from_configuration'
  | 'add_integration_to_configuration'
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
  configurations: '/configs',
  configurations_list: '/configs',
  configuration_details: '/configs/:configId/:tabId?',
  configuration_details_settings: '/configs/:configId/settings',
  add_integration_from_configuration: '/configs/:configId/add-integration',
  add_integration_to_configuration: '/integrations/:pkgkey/add-integration',
  edit_integration: '/configs/:configId/edit-integration/:packageConfigId',
  fleet: '/fleet',
  fleet_agent_list: '/fleet/agents',
  fleet_agent_details: '/fleet/agents/:agentId/:tabId?',
  fleet_agent_details_events: '/fleet/agents/:agentId',
  fleet_agent_details_details: '/fleet/agents/:agentId/details',
  fleet_enrollment_tokens: '/fleet/enrollment-tokens',
  data_streams: '/datasets',
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
  configurations: () => '/configs',
  configurations_list: () => '/configs',
  configuration_details: ({ configId, tabId }) => `/configs/${configId}${tabId ? `/${tabId}` : ''}`,
  add_integration_from_configuration: ({ configId }) => `/configs/${configId}/add-integration`,
  add_integration_to_configuration: ({ pkgkey }) => `/integrations/${pkgkey}/add-integration`,
  edit_integration: ({ configId, packageConfigId }) =>
    `/configs/${configId}/edit-integration/${packageConfigId}`,
  fleet: () => '/fleet',
  fleet_agent_list: ({ kuery }) => `/fleet/agents${kuery ? `?kuery=${kuery}` : ''}`,
  fleet_agent_details: ({ agentId, tabId }) =>
    `/fleet/agents/${agentId}${tabId ? `/${tabId}` : ''}`,
  fleet_enrollment_tokens: () => '/fleet/enrollment-tokens',
  data_streams: () => '/datasets',
};
