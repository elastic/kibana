/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  EPM_API_ROOT,
  EPM_API_ROUTES,
  DATA_STREAM_API_ROUTES,
  AGENT_CONFIG_API_ROUTES,
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
    return `${EPM_API_ROOT}${filePath}`;
  },

  getInstallPath: (pkgkey: string) => {
    return EPM_API_ROUTES.INSTALL_PATTERN.replace('{pkgkey}', pkgkey).replace(/\/$/, ''); // trim trailing slash
  },

  getRemovePath: (pkgkey: string) => {
    return EPM_API_ROUTES.DELETE_PATTERN.replace('{pkgkey}', pkgkey).replace(/\/$/, ''); // trim trailing slash
  },
};

export const dataStreamRouteService = {
  getListPath: () => {
    return DATA_STREAM_API_ROUTES.LIST_PATTERN;
  },

  getInfoPath: (dataStreamId: string) => {
    return DATA_STREAM_API_ROUTES.INFO_PATTERN.replace('{dataStreamId}', dataStreamId);
  },

  getCreatePath: () => {
    return DATA_STREAM_API_ROUTES.CREATE_PATTERN;
  },

  getUpdatePath: (dataStreamId: string) => {
    return DATA_STREAM_API_ROUTES.UPDATE_PATTERN.replace('{dataStreamId}', dataStreamId);
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

  getDeletePath: (agentConfigId: string) => {
    return AGENT_CONFIG_API_ROUTES.DELETE_PATTERN.replace('{agentConfigId}', agentConfigId);
  },
};
