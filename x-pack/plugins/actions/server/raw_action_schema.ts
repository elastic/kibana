/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const rawActionSchema = schema.object({
  actionTypeId: schema.string(),
  name: schema.string(),
  isMissingSecrets: schema.boolean(),
  config: schema.recordOf(schema.string(), schema.any()),
  secrets: schema.recordOf(schema.string(), schema.any()),
});

export const rawPreconfiguredActionSchema = schema.object({
  id: schema.string(),
  actionTypeId: schema.string(),
  name: schema.string(),
  isMissingSecrets: schema.maybe(schema.boolean()),
  config: schema.maybe(schema.recordOf(schema.string(), schema.any())),
  secrets: schema.recordOf(schema.string(), schema.any()),
  isPreconfigured: schema.boolean(),
  isDeprecated: schema.boolean(),
});
