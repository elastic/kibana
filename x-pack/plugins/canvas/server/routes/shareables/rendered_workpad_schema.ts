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

export const ContainerStyleSchema = schema.object({
  type: schema.maybe(schema.string()),
  border: schema.maybe(schema.string()),
  borderRadius: schema.maybe(schema.string()),
  padding: schema.maybe(schema.string()),
  backgroundColor: schema.maybe(schema.string()),
  backgroundImage: schema.maybe(schema.string()),
  backgroundSize: schema.maybe(schema.string()),
  backgroundRepeat: schema.maybe(schema.string()),
  opacity: schema.maybe(schema.number()),
  overflow: schema.maybe(schema.string()),
});

export const RenderableSchema = schema.object({
  error: schema.nullable(schema.string()),
  state: schema.string(),
  value: schema.object({
    as: schema.string(),
    containerStyle: ContainerStyleSchema,
    css: schema.maybe(schema.string()),
    type: schema.string(),
    value: schema.any(),
  }),
});

export const RenderedWorkpadElementSchema = schema.object({
  expressionRenderable: RenderableSchema,
  id: schema.string(),
  position: PositionSchema,
});

export const RenderedWorkpadPageSchema = schema.object({
  id: schema.string(),
  elements: schema.arrayOf(RenderedWorkpadElementSchema),
  groups: schema.maybe(schema.arrayOf(schema.arrayOf(RenderedWorkpadElementSchema))),
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

export const RenderedWorkpadSchema = schema.object({
  '@created': schema.maybe(schema.string()),
  '@timestamp': schema.maybe(schema.string()),
  assets: schema.maybe(schema.recordOf(schema.string(), RenderedWorkpadPageSchema)),
  colors: schema.arrayOf(schema.string()),
  css: schema.string(),
  height: schema.number(),
  id: schema.string(),
  isWriteable: schema.maybe(schema.boolean()),
  name: schema.string(),
  page: schema.number(),
  pages: schema.arrayOf(RenderedWorkpadPageSchema),
  width: schema.number(),
});
