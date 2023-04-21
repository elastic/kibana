/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import {
  NewOutputSchema,
  UpdateOutputSchema,
  ESLogstashOutputSchema,
  UpdateESOrLogstashOutputSchema,
} from '../models';

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

// old schemas: to be removed once the old endpoints are deprecated
export const PostOutputRequestSchema = {
  body: NewOutputSchema,
};

export const PutOutputRequestSchema = {
  params: schema.object({
    outputId: schema.string(),
  }),
  body: UpdateOutputSchema,
};
//

export const PostESLogstashOutputRequestSchema = {
  body: ESLogstashOutputSchema,
};

export const PutESLogstashOutputRequestSchema = {
  params: schema.object({
    outputId: schema.string(),
  }),
  body: UpdateESOrLogstashOutputSchema,
};
