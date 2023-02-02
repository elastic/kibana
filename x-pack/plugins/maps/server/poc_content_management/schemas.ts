/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { ContentSchemas } from '@kbn/content-management-plugin/server';

const mapSchema = schema.object({
  title: schema.string(),
  description: schema.string(),
  layerListJSON: schema.string(),
  mapStateJSON: schema.string(),
  uiStateJSON: schema.string(),
});

const savedObjectOptions = {
  references: schema.maybe(schema.arrayOf(schema.string())),
};

export const contentSchemas: ContentSchemas = {
  get: {
    in: {
      options: schema.maybe(
        schema.object({
          ...savedObjectOptions,
        })
      ),
    },
    out: {
      result: schema.any(), // This will have to be a proper Maps Saved object schema
    },
  },
  create: {
    in: {
      data: mapSchema,
      options: schema.maybe(
        schema.object({
          ...savedObjectOptions,
        })
      ),
    },
    out: {
      result: schema.any(), // This will be a proper schema of a map created
    },
  },
};
