/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpFetchOptions, HttpStart } from 'kibana/public';
import {
  GetPackageConfigsRequest,
  GetAgentStatusResponse,
  DeletePackageConfigsResponse,
  DeletePackageConfigsRequest,
  PACKAGE_CONFIG_SAVED_OBJECT_TYPE,
  GetPackagesResponse,
} from '../../../../../../../../ingest_manager/common';
import { GetPolicyListResponse, GetPolicyResponse, UpdatePolicyResponse } from '../../../types';
import { NewPolicyData } from '../../../../../../../common/endpoint/types';

const INGEST_API_ROOT = `/api/ingest_manager`;
export const INGEST_API_PACKAGE_CONFIGS = `${INGEST_API_ROOT}/package_configs`;
const INGEST_API_FLEET = `${INGEST_API_ROOT}/fleet`;
const INGEST_API_FLEET_AGENT_STATUS = `${INGEST_API_FLEET}/agent-status`;
export const INGEST_API_EPM_PACKAGES = `${INGEST_API_ROOT}/epm/packages`;
const INGEST_API_DELETE_PACKAGE_CONFIG = `${INGEST_API_PACKAGE_CONFIGS}/delete`;

/**
 * Retrieves a list of endpoint specific package configs (those created with a `package.name` of
 * `endpoint`) from Ingest
 * @param http
 * @param options
 */
export const sendGetEndpointSpecificPackageConfigs = (
  http: HttpStart,
  options: HttpFetchOptions & Partial<GetPackageConfigsRequest> = {}
): Promise<GetPolicyListResponse> => {
  return http.get<GetPolicyListResponse>(INGEST_API_PACKAGE_CONFIGS, {
    ...options,
    query: {
      ...options.query,
      kuery: `${
        options?.query?.kuery ? `${options.query.kuery} and ` : ''
      }${PACKAGE_CONFIG_SAVED_OBJECT_TYPE}.package.name: endpoint`,
    },
  });
};

/**
 * Retrieves a single package config based on ID from ingest
 * @param http
 * @param packageConfigId
 * @param options
 */
export const sendGetPackageConfig = (
  http: HttpStart,
  packageConfigId: string,
  options?: HttpFetchOptions
) => {
  return http.get<GetPolicyResponse>(`${INGEST_API_PACKAGE_CONFIGS}/${packageConfigId}`, options);
};

/**
 * Retrieves a single package config based on ID from ingest
 * @param http
 * @param body
 * @param options
 */
export const sendDeletePackageConfig = (
  http: HttpStart,
  body: DeletePackageConfigsRequest,
  options?: HttpFetchOptions
) => {
  return http.post<DeletePackageConfigsResponse>(INGEST_API_DELETE_PACKAGE_CONFIG, {
    ...options,
    body: JSON.stringify(body.body),
  });
};

/**
 * Updates a package config
 *
 * @param http
 * @param packageConfigId
 * @param packageConfig
 * @param options
 */
export const sendPutPackageConfig = (
  http: HttpStart,
  packageConfigId: string,
  packageConfig: NewPolicyData,
  options: Exclude<HttpFetchOptions, 'body'> = {}
): Promise<UpdatePolicyResponse> => {
  return http.put(`${INGEST_API_PACKAGE_CONFIGS}/${packageConfigId}`, {
    ...options,
    body: JSON.stringify(packageConfig),
  });
};

/**
 * Get a status summary for all Agents that are currently assigned to a given agent configuration
 *
 * @param http
 * @param configId
 * @param options
 */
export const sendGetFleetAgentStatusForConfig = (
  http: HttpStart,
  /** the Agent (fleet) configuration id */
  configId: string,
  options: Exclude<HttpFetchOptions, 'query'> = {}
): Promise<GetAgentStatusResponse> => {
  return http.get(INGEST_API_FLEET_AGENT_STATUS, {
    ...options,
    query: {
      configId,
    },
  });
};

/**
 * Get Endpoint Security Package information
 */
export const sendGetEndpointSecurityPackage = async (
  http: HttpStart
): Promise<GetPackagesResponse['response'][0]> => {
  const options = { query: { category: 'security' } };
  const securityPackages = await http.get<GetPackagesResponse>(INGEST_API_EPM_PACKAGES, options);
  const endpointPackageInfo = securityPackages.response.find(
    (epmPackage) => epmPackage.name === 'endpoint'
  );
  if (!endpointPackageInfo) {
    throw new Error('Endpoint package was not found.');
  }
  return endpointPackageInfo;
};
