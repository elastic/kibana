/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  EPM_API_ROOT,
  EPM_API_ROUTES,
  DATASOURCE_API_ROUTES,
  AGENT_CONFIG_API_ROUTES,
  FLEET_SETUP_API_ROUTES,
  AGENT_API_ROUTES,
  ENROLLMENT_API_KEY_ROUTES,
  SETUP_API_ROUTE,
} from '../constants';

export const epmRouteService = {
  getCategoriesPath: () => {
    return EPM_API_ROUTES.CATEGORIES_PATTERN;
  },

  getListPath: () => {
    return EPM_API_ROUTES.LIST_PATTERN;
  },

  getInfoPath: (pkgkey: string) => {
    return EPM_API_ROUTES.INFO_PATTERN.replace('{pkgkey}', pkgkey);
  },

  getFilePath: (filePath: string) => {
    return `${EPM_API_ROOT}${filePath.replace('/package', '/packages')}`;
  },

  getInstallPath: (pkgkey: string) => {
    return EPM_API_ROUTES.INSTALL_PATTERN.replace('{pkgkey}', pkgkey).replace(/\/$/, ''); // trim trailing slash
  },

  getRemovePath: (pkgkey: string) => {
    return EPM_API_ROUTES.DELETE_PATTERN.replace('{pkgkey}', pkgkey).replace(/\/$/, ''); // trim trailing slash
  },
};

export const datasourceRouteService = {
  getListPath: () => {
    return DATASOURCE_API_ROUTES.LIST_PATTERN;
  },

  getInfoPath: (datasourceId: string) => {
    return DATASOURCE_API_ROUTES.INFO_PATTERN.replace('{datasourceId}', datasourceId);
  },

  getCreatePath: () => {
    return DATASOURCE_API_ROUTES.CREATE_PATTERN;
  },

  getUpdatePath: (datasourceId: string) => {
    return DATASOURCE_API_ROUTES.UPDATE_PATTERN.replace('{datasourceId}', datasourceId);
  },

  getDeletePath: () => {
    return DATASOURCE_API_ROUTES.DELETE_PATTERN;
  },
};

export const agentConfigRouteService = {
  getListPath: () => {
    return AGENT_CONFIG_API_ROUTES.LIST_PATTERN;
  },

  getInfoPath: (agentConfigId: string) => {
    return AGENT_CONFIG_API_ROUTES.INFO_PATTERN.replace('{agentConfigId}', agentConfigId);
  },

  getCreatePath: () => {
    return AGENT_CONFIG_API_ROUTES.CREATE_PATTERN;
  },

  getUpdatePath: (agentConfigId: string) => {
    return AGENT_CONFIG_API_ROUTES.UPDATE_PATTERN.replace('{agentConfigId}', agentConfigId);
  },

  getDeletePath: () => {
    return AGENT_CONFIG_API_ROUTES.DELETE_PATTERN;
  },
};

export const fleetSetupRouteService = {
  getFleetSetupPath: () => FLEET_SETUP_API_ROUTES.INFO_PATTERN,
  postFleetSetupPath: () => FLEET_SETUP_API_ROUTES.CREATE_PATTERN,
};

export const agentRouteService = {
  getInfoPath: (agentId: string) => AGENT_API_ROUTES.INFO_PATTERN.replace('{agentId}', agentId),
  getUpdatePath: (agentId: string) => AGENT_API_ROUTES.UPDATE_PATTERN.replace('{agentId}', agentId),
  getEventsPath: (agentId: string) => AGENT_API_ROUTES.EVENTS_PATTERN.replace('{agentId}', agentId),
  getUnenrollPath: () => AGENT_API_ROUTES.UNENROLL_PATTERN,
  getListPath: () => AGENT_API_ROUTES.LIST_PATTERN,
  getStatusPath: () => AGENT_API_ROUTES.STATUS_PATTERN,
};

export const enrollmentAPIKeyRouteService = {
  getListPath: () => ENROLLMENT_API_KEY_ROUTES.LIST_PATTERN,
  getCreatePath: () => ENROLLMENT_API_KEY_ROUTES.CREATE_PATTERN,
  getInfoPath: (keyId: string) => ENROLLMENT_API_KEY_ROUTES.INFO_PATTERN.replace('{keyId}', keyId),
  getDeletePath: (keyId: string) =>
    ENROLLMENT_API_KEY_ROUTES.DELETE_PATTERN.replace('{keyId}', keyId),
};

export const setupRouteService = {
  getSetupPath: () => SETUP_API_ROUTE,
};
