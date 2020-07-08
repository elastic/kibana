/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';

export const templateSchema = schema.object({
  name: schema.string(),
  indexPatterns: schema.arrayOf(schema.string()),
  version: schema.maybe(schema.number()),
  order: schema.maybe(schema.number()),
  priority: schema.maybe(schema.number()),
  template: schema.maybe(
    schema.object({
      settings: schema.maybe(schema.object({}, { unknowns: 'allow' })),
      aliases: schema.maybe(schema.object({}, { unknowns: 'allow' })),
      mappings: schema.maybe(schema.object({}, { unknowns: 'allow' })),
    })
  ),
  composedOf: schema.maybe(schema.arrayOf(schema.string())),
  _meta: schema.maybe(schema.object({}, { unknowns: 'allow' })),
  ilmPolicy: schema.maybe(
    schema.object({
      name: schema.maybe(schema.string()),
      rollover_alias: schema.maybe(schema.string()),
    })
  ),
  _kbnMeta: schema.object({
    isManaged: schema.maybe(schema.boolean()),
    isCloudManaged: schema.maybe(schema.boolean()),
    hasDatastream: schema.maybe(schema.boolean()),
    isLegacy: schema.maybe(schema.boolean()),
  }),
});
