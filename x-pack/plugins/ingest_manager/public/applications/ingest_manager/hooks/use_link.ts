/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BASE_PATH } from '../constants';
import { useCore } from './';

type StaticPage =
  | 'overview'
  | 'integrations_all'
  | 'integrations_installed'
  | 'configurations_list'
  | 'fleet'
  | 'fleet_agent_list'
  | 'fleet_enrollment_tokens'
  | 'data_streams';

type DynamicPage =
  | 'integration_details'
  | 'configuration_details'
  | 'add_datasource_from_integration'
  | 'add_datasource_from_configuration'
  | 'edit_datasource'
  | 'fleet_agent_details';

interface DynamicPagePathValues {
  [key: string]: string;
}

const pagePaths: {
  [key in StaticPage]: () => string;
} &
  {
    [key in DynamicPage]: (values: DynamicPagePathValues) => string;
  } = {
  overview: () => '/',
  integrations_all: () => '/epm',
  integrations_installed: () => '/epm/installed',
  integration_details: ({ pkgkey, panel }) => `/epm/detail/${pkgkey}${panel ? `/${panel}` : ''}`,
  configurations_list: () => '/configs',
  configuration_details: ({ configId, tabId }) => `/configs/${configId}${tabId ? `/${tabId}` : ''}`,
  add_datasource_from_integration: ({ pkgkey }) => `/epm/${pkgkey}/add-datasource`,
  add_datasource_from_configuration: ({ configId }) => `/configs/${configId}/add-datasource`,
  edit_datasource: ({ configId, datasourceId }) =>
    `/configs/${configId}/edit-datasource/${datasourceId}`,
  fleet: () => '/fleet',
  fleet_agent_list: () => '/fleet/agents',
  fleet_agent_details: ({ agentId, tabId }) =>
    `/fleet/agents/${agentId}${tabId ? `/${tabId}` : ''}`,
  fleet_enrollment_tokens: () => '/fleet/enrollment-tokens',
  data_streams: () => '/data-streams',
};

const getPath = (page: StaticPage | DynamicPage, values?: DynamicPagePathValues): string => {
  return values ? pagePaths[page](values) : pagePaths[page as StaticPage]();
};

export const useLink = () => {
  const core = useCore();
  return {
    getPath: (page: StaticPage | DynamicPage, values?: DynamicPagePathValues) => {
      return getPath(page, values);
    },
    getHref: (page: StaticPage | DynamicPage, values?: DynamicPagePathValues) => {
      const path = getPath(page, values);
      return core.http.basePath.prepend(`${BASE_PATH}#${path}`);
    },
  };
};
