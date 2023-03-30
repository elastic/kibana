/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpFetchOptions, HttpStart } from '@kbn/core/public';
import type {
  GetAgentStatusResponse,
  GetAgentPoliciesRequest,
  GetAgentPoliciesResponse,
  GetPackagePoliciesResponse,
  GetInfoResponse,
} from '@kbn/fleet-plugin/common';
import { epmRouteService } from '@kbn/fleet-plugin/common';

import type { NewPolicyData } from '../../../../common/endpoint/types';
import type { GetPolicyResponse, UpdatePolicyResponse } from '../../pages/policy/types';

const INGEST_API_ROOT = `/api/fleet`;
export const INGEST_API_PACKAGE_POLICIES = `${INGEST_API_ROOT}/package_policies`;
export const INGEST_API_AGENT_POLICIES = `${INGEST_API_ROOT}/agent_policies`;
const INGEST_API_FLEET_AGENT_STATUS = `${INGEST_API_ROOT}/agent_status`;
export const INGEST_API_FLEET_AGENTS = `${INGEST_API_ROOT}/agents`;
export const INGEST_API_EPM_PACKAGES = `${INGEST_API_ROOT}/epm/packages`;

/**
 * Retrieves a single package policy based on ID from ingest
 * @param http
 * @param packagePolicyId
 * @param options
 */
export const sendGetPackagePolicy = (
  http: HttpStart,
  packagePolicyId: string,
  options?: HttpFetchOptions
) => {
  return http.get<GetPolicyResponse>(`${INGEST_API_PACKAGE_POLICIES}/${packagePolicyId}`, options);
};

/**
 * Retrieves multiple package policies by ids
 * @param http
 * @param packagePolicyIds
 * @param options
 */
export const sendBulkGetPackagePolicies = (
  http: HttpStart,
  packagePolicyIds: string[],
  options?: HttpFetchOptions
) => {
  return http.post<GetPackagePoliciesResponse>(`${INGEST_API_PACKAGE_POLICIES}/_bulk_get`, {
    ...options,
    body: JSON.stringify({
      ids: packagePolicyIds,
      ignoreMissing: true,
    }),
  });
};

/**
 * Retrieve a list of Agent Policies
 * @param http
 * @param options
 */
export const sendGetAgentPolicyList = (
  http: HttpStart,
  options: HttpFetchOptions & GetAgentPoliciesRequest
) => {
  return http.get<GetAgentPoliciesResponse>(INGEST_API_AGENT_POLICIES, options);
};

/**
 * Retrieve a list of Agent Policies
 * @param http
 * @param options
 */
export const sendBulkGetAgentPolicyList = (
  http: HttpStart,
  ids: string[],
  options: HttpFetchOptions = {}
) => {
  return http.post<GetAgentPoliciesResponse>(`${INGEST_API_AGENT_POLICIES}/_bulk_get`, {
    ...options,
    body: JSON.stringify({
      ids,
      ignoreMissing: true,
      full: true,
    }),
  });
};

/**
 * Updates a package policy
 *
 * @param http
 * @param packagePolicyId
 * @param packagePolicy
 * @param options
 */
export const sendPutPackagePolicy = (
  http: HttpStart,
  packagePolicyId: string,
  packagePolicy: NewPolicyData,
  options: Exclude<HttpFetchOptions, 'body'> = {}
): Promise<UpdatePolicyResponse> => {
  return http.put(`${INGEST_API_PACKAGE_POLICIES}/${packagePolicyId}`, {
    ...options,
    body: JSON.stringify(packagePolicy),
  });
};

/**
 * Get a status summary for all Agents that are currently assigned to a given agent policy
 *
 * @param http
 * @param policyId
 * @param options
 */
export const sendGetFleetAgentStatusForPolicy = (
  http: HttpStart,
  /** the Agent (fleet) policy id */
  policyId: string,
  options: Exclude<HttpFetchOptions, 'query'> = {}
): Promise<GetAgentStatusResponse> => {
  return http.get(INGEST_API_FLEET_AGENT_STATUS, {
    ...options,
    query: {
      policyId,
    },
  });
};

/**
 * Get Endpoint Security Package information
 */
export const sendGetEndpointSecurityPackage = async (
  http: HttpStart
): Promise<GetInfoResponse['item']> => {
  const path = epmRouteService.getInfoPath('endpoint');
  const endpointPackageResponse = await http.get<GetInfoResponse>(path);
  const endpointPackageInfo = endpointPackageResponse.item;
  if (!endpointPackageInfo) {
    throw new Error('Endpoint package was not found.');
  }
  return endpointPackageInfo;
};
