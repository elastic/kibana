/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpFetchOptions, HttpStart } from 'kibana/public';
import { GetDatasourcesRequest } from '../../../../../ingest_manager/common/types/rest_spec';
import { PolicyData } from '../types';

const INGEST_API_ROOT = `/api/ingest_manager`;
const INGEST_API_DATASOURCES = `${INGEST_API_ROOT}/datasources`;

interface GetDatasourcesResponse {
  items: PolicyData[];
  total: number;
  page: number;
  perPage: number;
  success: boolean;
}

interface GetDatasourceResponse {
  item: PolicyData;
  success: boolean;
}

/**
 * Retrieves a list of endpoint specific datasources (those created with a package.name of
 * `endpoint`) from Ingest
 * @param http
 * @param options
 */
export const sendGetEndpoingDatasources = (
  http: HttpStart,
  options: HttpFetchOptions & Partial<GetDatasourcesRequest> = {}
) => {
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
