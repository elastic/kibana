/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema } from '@kbn/config-schema';

export const componentTemplateSchema = {
  template: schema.object({
    settings: schema.maybe(schema.object({}, { unknowns: 'allow' })),
    aliases: schema.maybe(schema.object({}, { unknowns: 'allow' })),
    mappings: schema.maybe(schema.object({}, { unknowns: 'allow' })),
  }),
  version: schema.maybe(schema.number()),
  _meta: schema.maybe(schema.object({}, { unknowns: 'allow' })),
};
