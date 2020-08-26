/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpFetchOptions, HttpStart } from 'kibana/public';
import {
  GetPackagePoliciesRequest,
  GetAgentStatusResponse,
  DeletePackagePoliciesResponse,
  DeletePackagePoliciesRequest,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
  GetPackagesResponse,
  GetAgentPoliciesRequest,
  GetAgentPoliciesResponse,
} from '../../../../../../../../ingest_manager/common';
import { GetPolicyListResponse, GetPolicyResponse, UpdatePolicyResponse } from '../../../types';
import { NewPolicyData } from '../../../../../../../common/endpoint/types';

const INGEST_API_ROOT = `/api/ingest_manager`;
export const INGEST_API_PACKAGE_POLICIES = `${INGEST_API_ROOT}/package_policies`;
export const INGEST_API_AGENT_POLICIES = `${INGEST_API_ROOT}/agent_policies`;
const INGEST_API_FLEET = `${INGEST_API_ROOT}/fleet`;
const INGEST_API_FLEET_AGENT_STATUS = `${INGEST_API_FLEET}/agent-status`;
export const INGEST_API_EPM_PACKAGES = `${INGEST_API_ROOT}/epm/packages`;
const INGEST_API_DELETE_PACKAGE_POLICY = `${INGEST_API_PACKAGE_POLICIES}/delete`;

/**
 * Retrieves a list of endpoint specific package policies (those created with a `package.name` of
 * `endpoint`) from Ingest
 * @param http
 * @param options
 */
export const sendGetEndpointSpecificPackagePolicies = (
  http: HttpStart,
  options: HttpFetchOptions & Partial<GetPackagePoliciesRequest> = {}
): Promise<GetPolicyListResponse> => {
  return http.get<GetPolicyListResponse>(INGEST_API_PACKAGE_POLICIES, {
    ...options,
    query: {
      ...options.query,
      kuery: `${
        options?.query?.kuery ? `${options.query.kuery} and ` : ''
      }${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name: endpoint`,
    },
  });
};

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
 * Retrieves a single package policy based on ID from ingest
 * @param http
 * @param body
 * @param options
 */
export const sendDeletePackagePolicy = (
  http: HttpStart,
  body: DeletePackagePoliciesRequest,
  options?: HttpFetchOptions
) => {
  return http.post<DeletePackagePoliciesResponse>(INGEST_API_DELETE_PACKAGE_POLICY, {
    ...options,
    body: JSON.stringify(body.body),
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
