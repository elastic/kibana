/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const FleetServerHostSchema = schema.object({
  id: schema.string(),
  name: schema.string(),
  host_urls: schema.arrayOf(schema.string(), { minSize: 1 }),
  is_default: schema.boolean({ defaultValue: false }),
  is_internal: schema.maybe(schema.boolean()),
  is_preconfigured: schema.boolean({ defaultValue: false }),
  proxy_id: schema.maybe(schema.oneOf([schema.literal(null), schema.string()])),
});

export const FleetServerHostResponseSchema = schema.object({
  item: FleetServerHostSchema,
});

export const PostFleetServerHostRequestSchema = {
  body: FleetServerHostSchema.extends({
    id: schema.maybe(schema.string()),
  }),
};

export const GetOneFleetServerHostRequestSchema = {
  params: schema.object({ itemId: schema.string() }),
};

export const PutFleetServerHostRequestSchema = {
  params: schema.object({ itemId: schema.string() }),
  body: schema.object({
    name: schema.maybe(schema.string()),
    host_urls: schema.maybe(schema.arrayOf(schema.string(), { minSize: 1 })),
    is_default: schema.maybe(schema.boolean({ defaultValue: false })),
    is_internal: schema.maybe(schema.boolean()),
    proxy_id: schema.nullable(schema.string()),
  }),
};

export const GetAllFleetServerHostRequestSchema = {};
