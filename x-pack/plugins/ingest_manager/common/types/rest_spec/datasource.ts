/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Datasource, NewDatasource } from '../models';

export interface GetDatasourcesRequest {
  query: {
    page: number;
    perPage: number;
    kuery?: string;
  };
}

export interface GetDatasourcesResponse {
  items: Datasource[];
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
  item: Datasource;
  success: boolean;
}

export interface CreateDatasourceRequest {
  body: NewDatasource;
}

export interface CreateDatasourceResponse {
  item: Datasource;
  success: boolean;
}

export type UpdateDatasourceRequest = GetOneDatasourceRequest & {
  body: NewDatasource;
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
