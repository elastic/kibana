/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';

export const PositionSchema = schema.object({
  angle: schema.number(),
  height: schema.number(),
  left: schema.number(),
  parent: schema.nullable(schema.string()),
  top: schema.number(),
  width: schema.number(),
});

export const WorkpadElementSchema = schema.object({
  expression: schema.string(),
  filter: schema.maybe(schema.nullable(schema.string())),
  id: schema.string(),
  position: PositionSchema,
});

export const WorkpadPageSchema = schema.object({
  elements: schema.arrayOf(WorkpadElementSchema),
  groups: schema.arrayOf(
    schema.object({
      id: schema.string(),
      position: PositionSchema,
    })
  ),
  id: schema.string(),
  style: schema.recordOf(schema.string(), schema.string()),
  transition: schema.maybe(
    schema.oneOf([
      schema.object({}),
      schema.object({
        name: schema.string(),
      }),
    ])
  ),
});

export const WorkpadAssetSchema = schema.object({
  '@created': schema.string(),
  id: schema.string(),
  type: schema.string(),
  value: schema.string(),
});

export const WorkpadSchema = schema.object({
  '@created': schema.maybe(schema.string()),
  '@timestamp': schema.maybe(schema.string()),
  assets: schema.maybe(schema.recordOf(schema.string(), WorkpadAssetSchema)),
  colors: schema.arrayOf(schema.string()),
  css: schema.string(),
  height: schema.number(),
  id: schema.string(),
  isWriteable: schema.maybe(schema.boolean()),
  name: schema.string(),
  page: schema.number(),
  pages: schema.arrayOf(WorkpadPageSchema),
  width: schema.number(),
});
