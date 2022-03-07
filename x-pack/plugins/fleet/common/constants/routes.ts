/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Base API paths

export const INTERNAL_ROOT = `/internal/fleet`;

export const API_ROOT = `/api/fleet`;
export const EPM_API_ROOT = `${API_ROOT}/epm`;
export const DATA_STREAM_API_ROOT = `${API_ROOT}/data_streams`;
export const PACKAGE_POLICY_API_ROOT = `${API_ROOT}/package_policies`;
export const AGENT_POLICY_API_ROOT = `${API_ROOT}/agent_policies`;

export const LIMITED_CONCURRENCY_ROUTE_TAG = 'ingest:limited-concurrency';

// EPM API routes
const EPM_PACKAGES_MANY = `${EPM_API_ROOT}/packages`;
const EPM_PACKAGES_BULK = `${EPM_PACKAGES_MANY}/_bulk`;
const EPM_PACKAGES_ONE_DEPRECATED = `${EPM_PACKAGES_MANY}/{pkgkey}`;
const EPM_PACKAGES_ONE = `${EPM_PACKAGES_MANY}/{pkgName}/{pkgVersion}`;
export const EPM_API_ROUTES = {
  BULK_INSTALL_PATTERN: EPM_PACKAGES_BULK,
  LIST_PATTERN: EPM_PACKAGES_MANY,
  LIMITED_LIST_PATTERN: `${EPM_PACKAGES_MANY}/limited`,
  INFO_PATTERN: EPM_PACKAGES_ONE,
  INSTALL_FROM_REGISTRY_PATTERN: EPM_PACKAGES_ONE,
  INSTALL_BY_UPLOAD_PATTERN: EPM_PACKAGES_MANY,
  DELETE_PATTERN: EPM_PACKAGES_ONE,
  FILEPATH_PATTERN: `${EPM_PACKAGES_ONE}/{filePath*}`,
  CATEGORIES_PATTERN: `${EPM_API_ROOT}/categories`,
  STATS_PATTERN: `${EPM_PACKAGES_MANY}/{pkgName}/stats`,

  INFO_PATTERN_DEPRECATED: EPM_PACKAGES_ONE_DEPRECATED,
  INSTALL_FROM_REGISTRY_PATTERN_DEPRECATED: EPM_PACKAGES_ONE_DEPRECATED,
  DELETE_PATTERN_DEPRECATED: EPM_PACKAGES_ONE_DEPRECATED,
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
  UPGRADE_PATTERN: `${PACKAGE_POLICY_API_ROOT}/upgrade`,
  DRYRUN_PATTERN: `${PACKAGE_POLICY_API_ROOT}/upgrade/dryrun`,
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
  DELETE_PATTERN: `${API_ROOT}/outputs/{outputId}`,
  CREATE_PATTERN: `${API_ROOT}/outputs`,
  LOGSTASH_API_KEY_PATTERN: `${API_ROOT}/logstash_api_keys`,
};

// Settings API routes
export const SETTINGS_API_ROUTES = {
  INFO_PATTERN: `${API_ROOT}/settings`,
  UPDATE_PATTERN: `${API_ROOT}/settings`,
};

// App API routes
export const APP_API_ROUTES = {
  CHECK_PERMISSIONS_PATTERN: `${API_ROOT}/check-permissions`,
  GENERATE_SERVICE_TOKEN_PATTERN: `${API_ROOT}/service_tokens`,
  // deprecated since 8.0
  GENERATE_SERVICE_TOKEN_PATTERN_DEPRECATED: `${API_ROOT}/service-tokens`,
};

// Agent API routes
export const AGENT_API_ROUTES = {
  LIST_PATTERN: `${API_ROOT}/agents`,
  INFO_PATTERN: `${API_ROOT}/agents/{agentId}`,
  UPDATE_PATTERN: `${API_ROOT}/agents/{agentId}`,
  DELETE_PATTERN: `${API_ROOT}/agents/{agentId}`,
  CHECKIN_PATTERN: `${API_ROOT}/agents/{agentId}/checkin`,
  ACKS_PATTERN: `${API_ROOT}/agents/{agentId}/acks`,
  ACTIONS_PATTERN: `${API_ROOT}/agents/{agentId}/actions`,
  UNENROLL_PATTERN: `${API_ROOT}/agents/{agentId}/unenroll`,
  BULK_UNENROLL_PATTERN: `${API_ROOT}/agents/bulk_unenroll`,
  REASSIGN_PATTERN: `${API_ROOT}/agents/{agentId}/reassign`,
  BULK_REASSIGN_PATTERN: `${API_ROOT}/agents/bulk_reassign`,
  STATUS_PATTERN: `${API_ROOT}/agent_status`,
  DATA_PATTERN: `${API_ROOT}/agent_status/data`,
  // deprecated since 8.0
  STATUS_PATTERN_DEPRECATED: `${API_ROOT}/agent-status`,
  UPGRADE_PATTERN: `${API_ROOT}/agents/{agentId}/upgrade`,
  BULK_UPGRADE_PATTERN: `${API_ROOT}/agents/bulk_upgrade`,
};

export const ENROLLMENT_API_KEY_ROUTES = {
  CREATE_PATTERN: `${API_ROOT}/enrollment_api_keys`,
  LIST_PATTERN: `${API_ROOT}/enrollment_api_keys`,
  INFO_PATTERN: `${API_ROOT}/enrollment_api_keys/{keyId}`,
  DELETE_PATTERN: `${API_ROOT}/enrollment_api_keys/{keyId}`,
  // deprecated since 8.0
  CREATE_PATTERN_DEPRECATED: `${API_ROOT}/enrollment-api-keys`,
  LIST_PATTERN_DEPRECATED: `${API_ROOT}/enrollment-api-keys`,
  INFO_PATTERN_DEPRECATED: `${API_ROOT}/enrollment-api-keys/{keyId}`,
  DELETE_PATTERN_DEPRECATED: `${API_ROOT}/enrollment-api-keys/{keyId}`,
};

// Agents setup API routes
export const AGENTS_SETUP_API_ROUTES = {
  INFO_PATTERN: `${API_ROOT}/agents/setup`,
  CREATE_PATTERN: `${API_ROOT}/agents/setup`,
};

export const SETUP_API_ROUTE = `${API_ROOT}/setup`;

export const INSTALL_SCRIPT_API_ROUTES = `${API_ROOT}/install/{osType}`;

// Policy preconfig API routes
export const PRECONFIGURATION_API_ROUTES = {
  UPDATE_PATTERN: `${API_ROOT}/setup/preconfiguration`,
  RESET_PATTERN: `${INTERNAL_ROOT}/reset_preconfigured_agent_policies`,
  RESET_ONE_PATTERN: `${INTERNAL_ROOT}/reset_preconfigured_agent_policies/{agentPolicyId}`,
};
