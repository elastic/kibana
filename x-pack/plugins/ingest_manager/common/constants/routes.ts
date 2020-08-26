/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
// Base API paths
export const API_ROOT = `/api/ingest_manager`;
export const EPM_API_ROOT = `${API_ROOT}/epm`;
export const DATA_STREAM_API_ROOT = `${API_ROOT}/data_streams`;
export const PACKAGE_POLICY_API_ROOT = `${API_ROOT}/package_policies`;
export const AGENT_POLICY_API_ROOT = `${API_ROOT}/agent_policies`;
export const FLEET_API_ROOT = `${API_ROOT}/fleet`;

export const LIMITED_CONCURRENCY_ROUTE_TAG = 'ingest:limited-concurrency';

// EPM API routes
const EPM_PACKAGES_MANY = `${EPM_API_ROOT}/packages`;
const EPM_PACKAGES_ONE = `${EPM_PACKAGES_MANY}/{pkgkey}`;
const EPM_PACKAGES_FILE = `${EPM_PACKAGES_MANY}/{pkgName}/{pkgVersion}`;
export const EPM_API_ROUTES = {
  LIST_PATTERN: EPM_PACKAGES_MANY,
  LIMITED_LIST_PATTERN: `${EPM_PACKAGES_MANY}/limited`,
  INFO_PATTERN: EPM_PACKAGES_ONE,
  INSTALL_PATTERN: EPM_PACKAGES_ONE,
  DELETE_PATTERN: EPM_PACKAGES_ONE,
  FILEPATH_PATTERN: `${EPM_PACKAGES_FILE}/{filePath*}`,
  CATEGORIES_PATTERN: `${EPM_API_ROOT}/categories`,
};

// Data stream API routes
export const DATA_STREAM_API_ROUTES = {
  LIST_PATTERN: `${DATA_STREAM_API_ROOT}`,
};

// Package policy API routes
export const PACKAGE_POLICY_API_ROUTES = {
  LIST_PATTERN: `${PACKAGE_POLICY_API_ROOT}`,
  INFO_PATTERN: `${PACKAGE_POLICY_API_ROOT}/{packagePolicyId}`,
  CREATE_PATTERN: `${PACKAGE_POLICY_API_ROOT}`,
  UPDATE_PATTERN: `${PACKAGE_POLICY_API_ROOT}/{packagePolicyId}`,
  DELETE_PATTERN: `${PACKAGE_POLICY_API_ROOT}/delete`,
};

// Agent policy API routes
export const AGENT_POLICY_API_ROUTES = {
  LIST_PATTERN: `${AGENT_POLICY_API_ROOT}`,
  INFO_PATTERN: `${AGENT_POLICY_API_ROOT}/{agentPolicyId}`,
  CREATE_PATTERN: `${AGENT_POLICY_API_ROOT}`,
  UPDATE_PATTERN: `${AGENT_POLICY_API_ROOT}/{agentPolicyId}`,
  COPY_PATTERN: `${AGENT_POLICY_API_ROOT}/{agentPolicyId}/copy`,
  DELETE_PATTERN: `${AGENT_POLICY_API_ROOT}/delete`,
  FULL_INFO_PATTERN: `${AGENT_POLICY_API_ROOT}/{agentPolicyId}/full`,
  FULL_INFO_DOWNLOAD_PATTERN: `${AGENT_POLICY_API_ROOT}/{agentPolicyId}/download`,
};

// Output API routes
export const OUTPUT_API_ROUTES = {
  LIST_PATTERN: `${API_ROOT}/outputs`,
  INFO_PATTERN: `${API_ROOT}/outputs/{outputId}`,
  UPDATE_PATTERN: `${API_ROOT}/outputs/{outputId}`,
};

// Settings API routes
export const SETTINGS_API_ROUTES = {
  INFO_PATTERN: `${API_ROOT}/settings`,
  UPDATE_PATTERN: `${API_ROOT}/settings`,
};

// App API routes
export const APP_API_ROUTES = {
  CHECK_PERMISSIONS_PATTERN: `${API_ROOT}/check-permissions`,
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
