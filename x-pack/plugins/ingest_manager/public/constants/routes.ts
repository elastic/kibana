/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { PLUGIN_ID } from './plugin';

// Base API paths
export const API_ROOT = `/api/${PLUGIN_ID}`;
export const EPM_API_ROOT = `${API_ROOT}/epm`;
export const FLEET_API_ROOT = `${API_ROOT}/fleet`;
export const CONFIG_API_ROOT = `${API_ROOT}/config`;

// EPM API routes
export const EPM_ROUTES = {
  API_LIST_PATTERN: `${EPM_API_ROOT}/list`,
  API_INFO_PATTERN: `${EPM_API_ROOT}/package/{pkgkey}`,
  API_INSTALL_PATTERN: `${EPM_API_ROOT}/install/{pkgkey}`,
  API_DELETE_PATTERN: `${EPM_API_ROOT}/delete/{pkgkey}`,
  API_CATEGORIES_PATTERN: `${EPM_API_ROOT}/categories`,
  API_INSTALL_DATASOURCE_PATTERN: `${EPM_API_ROOT}/datasources`,
};

// Fleet API routes
export const FLEET_ROUTES = {};

// Config API routes
export const CONFIG_ROUTES = {};
