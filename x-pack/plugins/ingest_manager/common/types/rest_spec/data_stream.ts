/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema } from '@kbn/config-schema';
import { NewDataStreamSchema } from '../models';
import { ListWithKuerySchema } from './common';

export const GetDataStreamsRequestSchema = {
  query: ListWithKuerySchema,
};

export const GetOneDataStreamRequestSchema = {
  params: schema.object({
    dataStreamId: schema.string(),
  }),
};

export const CreateDataStreamRequestSchema = {
  body: NewDataStreamSchema,
};

export const UpdateDataStreamRequestSchema = {
  ...GetOneDataStreamRequestSchema,
  body: NewDataStreamSchema,
};
