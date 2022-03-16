/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeOf, schema } from '@kbn/config-schema';

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
  filter: schema.nullable(schema.string({ defaultValue: '' })),
  id: schema.string(),
  position: PositionSchema,
});

export const WorkpadPageSchema = schema.object({
  elements: schema.arrayOf(WorkpadElementSchema),
  groups: schema.arrayOf(
    schema.object({
      id: schema.string(),
      position: PositionSchema,
    }),
    { defaultValue: [] }
  ),
  id: schema.string(),
  style: schema.recordOf(schema.string(), schema.string()),
  transition: schema.oneOf(
    [
      schema.object({}, { defaultValue: {} }),
      schema.object({
        name: schema.string(),
      }),
    ],
    { defaultValue: {} }
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
  type: schema.string({
    validate: (type) => {
      const validTypes = ['string', 'number', 'boolean'];
      if (type && !validTypes.includes(type)) {
        return `${type} is invalid type for a variable. Valid types: ${validTypes.join(', ')}.`;
      }
    },
  }),
});

const commonWorkpadFields = {
  '@created': schema.maybe(schema.string()),
  '@timestamp': schema.maybe(schema.string()),
  colors: schema.arrayOf(schema.string()),
  css: schema.string(),
  variables: schema.arrayOf(WorkpadVariable),
  height: schema.number(),
  id: schema.maybe(schema.string()),
  isWriteable: schema.maybe(schema.boolean()),
  name: schema.string(),
  page: schema.number(),
  pages: schema.arrayOf(WorkpadPageSchema),
  width: schema.number(),
};

const WorkpadSchemaWithoutValidation = schema.object({
  assets: schema.maybe(schema.recordOf(schema.string(), WorkpadAssetSchema)),
  ...commonWorkpadFields,
});

const ImportedWorkpadSchemaWithoutValidation = schema.object({
  assets: schema.recordOf(schema.string(), WorkpadAssetSchema),
  ...commonWorkpadFields,
});

const validate = (workpad: TypeOf<typeof WorkpadSchemaWithoutValidation>) => {
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
};

export const WorkpadSchema = WorkpadSchemaWithoutValidation.extends(
  {},
  {
    validate,
  }
);

export const ImportedWorkpadSchema = ImportedWorkpadSchemaWithoutValidation.extends(
  {},
  {
    validate,
  }
);
