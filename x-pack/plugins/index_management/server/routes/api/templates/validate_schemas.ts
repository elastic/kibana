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
  settings: schema.maybe(schema.object({}, { allowUnknowns: true })),
  aliases: schema.maybe(schema.object({}, { allowUnknowns: true })),
  mappings: schema.maybe(schema.object({}, { allowUnknowns: true })),
  ilmPolicy: schema.maybe(
    schema.object({
      name: schema.maybe(schema.string()),
      rollover_alias: schema.maybe(schema.string()),
    })
  ),
  isManaged: schema.maybe(schema.boolean()),
});
