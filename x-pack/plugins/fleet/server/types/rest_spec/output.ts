/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { NewOutputSchema, UpdateOutputSchema } from '../models';

export const GetOneOutputRequestSchema = {
  params: schema.object({
    outputId: schema.string(),
  }),
};

export const DeleteOutputRequestSchema = {
  params: schema.object({
    outputId: schema.string(),
  }),
};

export const GetOutputsRequestSchema = {};

export const PostOutputRequestSchema = {
  body: NewOutputSchema,
};

export const PutOutputRequestSchema = {
  params: schema.object({
    outputId: schema.string(),
  }),
  body: UpdateOutputSchema,
};
