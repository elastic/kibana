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
const EPM_PACKAGES_MANY = `${EPM_API_ROOT}/packages`;
const EPM_PACKAGES_ONE = `${EPM_PACKAGES_MANY}/{pkgkey}`;
const EPM_PACKAGES_FILE = `${EPM_PACKAGES_MANY}/{pkgName}/{pkgVersion}`;
export const EPM_API_ROUTES = {
  LIST_PATTERN: EPM_PACKAGES_MANY,
  INFO_PATTERN: EPM_PACKAGES_ONE,
  INSTALL_PATTERN: EPM_PACKAGES_ONE,
  DELETE_PATTERN: EPM_PACKAGES_ONE,
  FILEPATH_PATTERN: `${EPM_PACKAGES_FILE}/{filePath*}`,
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
  FULL_INFO_PATTERN: `${AGENT_CONFIG_API_ROOT}/{agentConfigId}/full`,
};

// Agent API routes
export const AGENT_API_ROUTES = {
  LIST_PATTERN: `${FLEET_API_ROOT}/agents`,
  INFO_PATTERN: `${FLEET_API_ROOT}/agents/{agentId}`,
  UPDATE_PATTERN: `${FLEET_API_ROOT}/agents/{agentId}`,
  DELETE_PATTERN: `${FLEET_API_ROOT}/agents/{agentId}`,
  EVENTS_PATTERN: `${FLEET_API_ROOT}/agents/{agentId}/events`,
  CHECKIN_PATTERN: `${FLEET_API_ROOT}/agents/{agentId}/checkin`,
  ACKS_PATTERN: `${FLEET_API_ROOT}/agents/{agentId}/acks`,
  ACTIONS_PATTERN: `${FLEET_API_ROOT}/agents/{agentId}/actions`,
  ENROLL_PATTERN: `${FLEET_API_ROOT}/agents/enroll`,
  UNENROLL_PATTERN: `${FLEET_API_ROOT}/agents/{agentId}/unenroll`,
  REASSIGN_PATTERN: `${FLEET_API_ROOT}/agents/{agentId}/reassign`,
  STATUS_PATTERN: `${FLEET_API_ROOT}/agent-status`,
};

export const ENROLLMENT_API_KEY_ROUTES = {
  CREATE_PATTERN: `${FLEET_API_ROOT}/enrollment-api-keys`,
  LIST_PATTERN: `${FLEET_API_ROOT}/enrollment-api-keys`,
  INFO_PATTERN: `${FLEET_API_ROOT}/enrollment-api-keys/{keyId}`,
  DELETE_PATTERN: `${FLEET_API_ROOT}/enrollment-api-keys/{keyId}`,
};

// Fleet setup API routes
export const FLEET_SETUP_API_ROUTES = {
  INFO_PATTERN: `${FLEET_API_ROOT}/setup`,
  CREATE_PATTERN: `${FLEET_API_ROOT}/setup`,
};

export const SETUP_API_ROUTE = `${API_ROOT}/setup`;

export const INSTALL_SCRIPT_API_ROUTES = `${FLEET_API_ROOT}/install/{osType}`;
