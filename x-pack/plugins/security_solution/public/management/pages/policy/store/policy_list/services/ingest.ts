/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpFetchOptions, HttpStart } from 'kibana/public';
import {
  GetDatasourcesRequest,
  GetAgentStatusResponse,
  DeleteDatasourcesResponse,
  DeleteDatasourcesRequest,
  DATASOURCE_SAVED_OBJECT_TYPE,
  GetPackagesResponse,
} from '../../../../../../../../ingest_manager/common';
import { GetPolicyListResponse, GetPolicyResponse, UpdatePolicyResponse } from '../../../types';
import { NewPolicyData } from '../../../../../../../common/endpoint/types';

const INGEST_API_ROOT = `/api/ingest_manager`;
export const INGEST_API_DATASOURCES = `${INGEST_API_ROOT}/datasources`;
const INGEST_API_FLEET = `${INGEST_API_ROOT}/fleet`;
const INGEST_API_FLEET_AGENT_STATUS = `${INGEST_API_FLEET}/agent-status`;
const INGEST_API_EPM_PACKAGES = `${INGEST_API_ROOT}/epm/packages`;
const INGEST_API_DELETE_DATASOURCE = `${INGEST_API_DATASOURCES}/delete`;

/**
 * Retrieves a list of endpoint specific datasources (those created with a `package.name` of
 * `endpoint`) from Ingest
 * @param http
 * @param options
 */
export const sendGetEndpointSpecificDatasources = (
  http: HttpStart,
  options: HttpFetchOptions & Partial<GetDatasourcesRequest> = {}
): Promise<GetPolicyListResponse> => {
  return http.get<GetPolicyListResponse>(INGEST_API_DATASOURCES, {
    ...options,
    query: {
      ...options.query,
      kuery: `${
        options?.query?.kuery ? `${options.query.kuery} and ` : ''
      }${DATASOURCE_SAVED_OBJECT_TYPE}.package.name: endpoint`,
    },
  });
};

/**
 * Retrieves a single datasource based on ID from ingest
 * @param http
 * @param datasourceId
 * @param options
 */
export const sendGetDatasource = (
  http: HttpStart,
  datasourceId: string,
  options?: HttpFetchOptions
) => {
  return http.get<GetPolicyResponse>(`${INGEST_API_DATASOURCES}/${datasourceId}`, options);
};

/**
 * Retrieves a single datasource based on ID from ingest
 * @param http
 * @param datasourceId
 * @param options
 */
export const sendDeleteDatasource = (
  http: HttpStart,
  body: DeleteDatasourcesRequest,
  options?: HttpFetchOptions
) => {
  return http.post<DeleteDatasourcesResponse>(INGEST_API_DELETE_DATASOURCE, {
    ...options,
    body: JSON.stringify(body.body),
  });
};

/**
 * Updates a datasources
 *
 * @param http
 * @param datasourceId
 * @param datasource
 * @param options
 */
export const sendPutDatasource = (
  http: HttpStart,
  datasourceId: string,
  datasource: NewPolicyData,
  options: Exclude<HttpFetchOptions, 'body'> = {}
): Promise<UpdatePolicyResponse> => {
  return http.put(`${INGEST_API_DATASOURCES}/${datasourceId}`, {
    ...options,
    body: JSON.stringify(datasource),
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
