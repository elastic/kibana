/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const PostFleetProxyRequestSchema = {
  body: schema.object({
    id: schema.maybe(schema.string()),
    url: schema.string(),
    name: schema.string(),
  }),
};

export const PutFleetProxyRequestSchema = {
  params: schema.object({ itemId: schema.string() }),
  body: schema.object({
    name: schema.maybe(schema.string()),
    url: schema.maybe(schema.string()),
  }),
};

export const GetOneFleetProxyRequestSchema = {
  params: schema.object({ itemId: schema.string() }),
};
