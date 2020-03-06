/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
// Base API paths
export const API_ROOT = `/api/ingest_manager`;
export const DATASOURCE_API_ROOT = `${API_ROOT}/datasources`;
export const AGENT_CONFIG_API_ROOT = `${API_ROOT}/agent_configs`;
export const EPM_API_ROOT = `${API_ROOT}/epm`;
export const FLEET_API_ROOT = `${API_ROOT}/fleet`;

// EPM API routes
export const EPM_API_ROUTES = {
  LIST_PATTERN: `${EPM_API_ROOT}/list`,
  INFO_PATTERN: `${EPM_API_ROOT}/package/{pkgkey}`,
  INSTALL_PATTERN: `${EPM_API_ROOT}/install/{pkgkey}`,
  DELETE_PATTERN: `${EPM_API_ROOT}/delete/{pkgkey}`,
  CATEGORIES_PATTERN: `${EPM_API_ROOT}/categories`,
};

// Datasource API routes
export const DATASOURCE_API_ROUTES = {
  LIST_PATTERN: `${DATASOURCE_API_ROOT}`,
  INFO_PATTERN: `${DATASOURCE_API_ROOT}/{datasourceId}`,
  CREATE_PATTERN: `${DATASOURCE_API_ROOT}`,
  UPDATE_PATTERN: `${DATASOURCE_API_ROOT}/{datasourceId}`,
  DELETE_PATTERN: `${DATASOURCE_API_ROOT}/delete`,
};

// Agent config API routes
export const AGENT_CONFIG_API_ROUTES = {
  LIST_PATTERN: `${AGENT_CONFIG_API_ROOT}`,
  INFO_PATTERN: `${AGENT_CONFIG_API_ROOT}/{agentConfigId}`,
  CREATE_PATTERN: `${AGENT_CONFIG_API_ROOT}`,
  UPDATE_PATTERN: `${AGENT_CONFIG_API_ROOT}/{agentConfigId}`,
  DELETE_PATTERN: `${AGENT_CONFIG_API_ROOT}/delete`,
};

// Fleet setup API routes
export const FLEET_SETUP_API_ROUTES = {
  INFO_PATTERN: `${FLEET_API_ROOT}/setup`,
  CREATE_PATTERN: `${FLEET_API_ROOT}/setup`,
};
