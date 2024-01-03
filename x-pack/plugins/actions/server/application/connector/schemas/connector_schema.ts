/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const connectorSchema = schema.object({
  id: schema.string(),
  name: schema.string(),
  actionTypeId: schema.string(),
  config: schema.maybe(schema.recordOf(schema.string(), schema.any())),
  isMissingSecrets: schema.maybe(schema.boolean()),
  isPreconfigured: schema.boolean(),
  isDeprecated: schema.boolean(),
  isSystemAction: schema.boolean(),
});

export const connectorWithExtraFindDataSchema = connectorSchema.extends({
  referencedByCount: schema.number(),
});
