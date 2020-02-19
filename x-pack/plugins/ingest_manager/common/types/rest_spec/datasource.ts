/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { NewDatasourceSchema } from '../models';
import { ListWithKuerySchema } from './common';

export interface GetDatasourcesRequestSchema {
  query: ListWithKuerySchema;
}

export interface GetOneDatasourceRequestSchema {
  params: {
    datasourceId: string;
  };
}

export interface CreateDatasourceRequestSchema {
  body: NewDatasourceSchema;
}

export type UpdateDatasourceRequestSchema = GetOneDatasourceRequestSchema & {
  body: NewDatasourceSchema;
};

export interface DeleteDatasourcesRequestSchema {
  body: {
    datasourceIds: string[];
  };
}

export type DeleteDatasourcesResponse = Array<{
  id: string;
  success: boolean;
}>;
