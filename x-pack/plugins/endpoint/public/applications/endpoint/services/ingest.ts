/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpFetchOptions, HttpStart } from 'kibana/public';
import {
  CreateDatasourceResponse,
  GetAgentStatusResponse,
  GetDatasourcesRequest,
} from '../../../../../ingest_manager/common/types/rest_spec';
import { NewPolicyData, PolicyData } from '../types';

const INGEST_API_ROOT = `/api/ingest_manager`;
const INGEST_API_DATASOURCES = `${INGEST_API_ROOT}/datasources`;
const INGEST_API_FLEET = `${INGEST_API_ROOT}/fleet`;
const INGEST_API_FLEET_AGENT_STATUS = `${INGEST_API_FLEET}/agent-status`;

// FIXME: Import from ingest after - https://github.com/elastic/kibana/issues/60677
export interface GetDatasourcesResponse {
  items: PolicyData[];
  total: number;
  page: number;
  perPage: number;
  success: boolean;
}

// FIXME: Import from Ingest after - https://github.com/elastic/kibana/issues/60677
export interface GetDatasourceResponse {
  item: PolicyData;
  success: boolean;
}

// FIXME: Import from Ingest after - https://github.com/elastic/kibana/issues/60677
export type UpdateDatasourceResponse = CreateDatasourceResponse & {
  item: PolicyData;
};

/**
 * Retrieves a list of endpoint specific datasources (those created with a `package.name` of
 * `endpoint`) from Ingest
 * @param http
 * @param options
 */
export const sendGetEndpointSpecificDatasources = (
  http: HttpStart,
  options: HttpFetchOptions & Partial<GetDatasourcesRequest> = {}
): Promise<GetDatasourcesResponse> => {
  return http.get<GetDatasourcesResponse>(INGEST_API_DATASOURCES, {
    ...options,
    query: {
      ...options.query,
      kuery: `${
        options?.query?.kuery ? options.query.kuery + ' and ' : ''
      }datasources.package.name: endpoint`,
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
  return http.get<GetDatasourceResponse>(`${INGEST_API_DATASOURCES}/${datasourceId}`, options);
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
): Promise<UpdateDatasourceResponse> => {
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
