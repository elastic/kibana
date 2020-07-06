/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema } from '@kbn/config-schema';

export const GetOneOutputRequestSchema = {
  params: schema.object({
    outputId: schema.string(),
  }),
};

export const GetOutputsRequestSchema = {};

export const PutOutputRequestSchema = {
  params: schema.object({
    outputId: schema.string(),
  }),
  body: schema.object({
    hosts: schema.maybe(schema.arrayOf(schema.uri({ scheme: ['http', 'https'] }))),
    ca_sha256: schema.maybe(schema.string()),
  }),
};
