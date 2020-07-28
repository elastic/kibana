/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema } from '@kbn/config-schema';
import { NewPackageConfigSchema, UpdatePackageConfigSchema } from '../models';
import { ListWithKuerySchema } from './index';

export const GetPackageConfigsRequestSchema = {
  query: ListWithKuerySchema,
};

export const GetOnePackageConfigRequestSchema = {
  params: schema.object({
    packageConfigId: schema.string(),
  }),
};

export const CreatePackageConfigRequestSchema = {
  body: NewPackageConfigSchema,
};

export const UpdatePackageConfigRequestSchema = {
  ...GetOnePackageConfigRequestSchema,
  body: UpdatePackageConfigSchema,
};

export const DeletePackageConfigsRequestSchema = {
  body: schema.object({
    packageConfigIds: schema.arrayOf(schema.string()),
  }),
};
