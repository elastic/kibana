/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const templateSchema = schema.object({
  name: schema.string({ maxLength: 1000 }),
  indexPatterns: schema.arrayOf(schema.string()),
  version: schema.maybe(schema.number()),
  order: schema.maybe(schema.number()),
  priority: schema.maybe(schema.number()),
  allowAutoCreate: schema.string(),
  template: schema.maybe(
    schema.object({
      settings: schema.maybe(schema.object({}, { unknowns: 'allow' })),
      aliases: schema.maybe(schema.object({}, { unknowns: 'allow' })),
      mappings: schema.maybe(schema.object({}, { unknowns: 'allow' })),
      lifecycle: schema.maybe(
        schema.object({
          enabled: schema.boolean(),
          data_retention: schema.maybe(schema.string()),
        })
      ),
    })
  ),
  composedOf: schema.maybe(schema.arrayOf(schema.string())),
  ignoreMissingComponentTemplates: schema.maybe(schema.arrayOf(schema.string())),
  dataStream: schema.maybe(
    schema.object(
      {
        hidden: schema.maybe(schema.boolean()),
      },
      { unknowns: 'allow' }
    )
  ),
  _meta: schema.maybe(schema.object({}, { unknowns: 'allow' })),
  ilmPolicy: schema.maybe(
    schema.object({
      name: schema.maybe(schema.string()),
      rollover_alias: schema.maybe(schema.string()),
    })
  ),
  _kbnMeta: schema.object({
    type: schema.string(),
    hasDatastream: schema.maybe(schema.boolean()),
    isLegacy: schema.maybe(schema.boolean()),
  }),
  deprecated: schema.maybe(schema.boolean()),
});
