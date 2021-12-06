/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
  groups: schema.maybe(
    schema.arrayOf(
      schema.object({
        id: schema.string(),
        position: PositionSchema,
      })
    )
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

export const WorkpadVariable = schema.object({
  name: schema.string(),
  value: schema.oneOf([schema.string(), schema.number(), schema.boolean()]),
  type: schema.string(),
});

export const WorkpadSchema = schema.object(
  {
    '@created': schema.maybe(schema.string()),
    '@timestamp': schema.maybe(schema.string()),
    assets: schema.maybe(schema.recordOf(schema.string(), WorkpadAssetSchema)),
    colors: schema.arrayOf(schema.string()),
    css: schema.string(),
    variables: schema.arrayOf(WorkpadVariable),
    height: schema.number(),
    id: schema.string(),
    isWriteable: schema.maybe(schema.boolean()),
    name: schema.string(),
    page: schema.number(),
    pages: schema.arrayOf(WorkpadPageSchema),
    width: schema.number(),
  },
  {
    validate: (workpad) => {
      // Validate unique page ids
      const pageIdsArray = workpad.pages.map((page) => page.id);
      const pageIdsSet = new Set(pageIdsArray);

      if (pageIdsArray.length !== pageIdsSet.size) {
        return 'Page Ids are not unique';
      }

      // Validate unique element ids
      const elementIdsArray = workpad.pages
        .map((page) => page.elements.map((element) => element.id))
        .flat();
      const elementIdsSet = new Set(elementIdsArray);

      if (elementIdsArray.length !== elementIdsSet.size) {
        return 'Element Ids are not unique';
      }
    },
  }
);
