/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { PackageConfig, NewPackageConfig } from '../models';

export interface GetDatasourcesRequest {
  query: {
    page: number;
    perPage: number;
    kuery?: string;
  };
}

export interface GetDatasourcesResponse {
  items: PackageConfig[];
  total: number;
  page: number;
  perPage: number;
  success: boolean;
}

export interface GetOneDatasourceRequest {
  params: {
    datasourceId: string;
  };
}

export interface GetOneDatasourceResponse {
  item: PackageConfig;
  success: boolean;
}

export interface CreateDatasourceRequest {
  body: NewPackageConfig;
}

export interface CreateDatasourceResponse {
  item: PackageConfig;
  success: boolean;
}

export type UpdateDatasourceRequest = GetOneDatasourceRequest & {
  body: NewPackageConfig;
};

export type UpdateDatasourceResponse = CreateDatasourceResponse;

export interface DeleteDatasourcesRequest {
  body: {
    datasourceIds: string[];
  };
}

export type DeleteDatasourcesResponse = Array<{
  id: string;
  success: boolean;
}>;
