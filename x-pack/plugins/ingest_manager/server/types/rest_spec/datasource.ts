/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema } from '@kbn/config-schema';
import { NewDatasourceSchema } from '../models';
import { ListWithKuerySchema } from './common';

export const GetDatasourcesRequestSchema = {
  query: ListWithKuerySchema,
};

export const GetOneDatasourceRequestSchema = {
  params: schema.object({
    datasourceId: schema.string(),
  }),
};

export const CreateDatasourceRequestSchema = {
  body: NewDatasourceSchema,
};

export const UpdateDatasourceRequestSchema = {
  ...GetOneDatasourceRequestSchema,
  body: NewDatasourceSchema,
};

export const DeleteDatasourcesRequestSchema = {
  body: schema.object({
    datasourceIds: schema.arrayOf(schema.string()),
  }),
};

export type DeleteDatasourcesResponse = Array<{
  id: string;
  success: boolean;
}>;
