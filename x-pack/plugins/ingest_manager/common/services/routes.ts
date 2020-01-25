/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  EPM_API_ROOT,
  EPM_API_ROUTES,
  FLEET_API_ROOT,
  FLEET_ROUTES,
  CONFIG_API_ROOT,
  CONFIG_ROUTES,
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

export const fleetRouteService = {};
export const configRouteService = {};
