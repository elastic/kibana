/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const rawConnectorSchema = schema.object({
  actionTypeId: schema.string(),
  name: schema.string(),
  isMissingSecrets: schema.boolean(),
  config: schema.recordOf(schema.string(), schema.any()),
  secrets: schema.recordOf(schema.string(), schema.any()),
  // PreconfiguredAction ---
  isPreconfigured: schema.maybe(schema.boolean()),
  isSystemAction: schema.boolean(),
  id: schema.conditional(
    schema.siblingRef('isPreconfigured'),
    true,
    schema.string(),
    schema.never()
  ),
  isDeprecated: schema.conditional(
    schema.siblingRef('isPreconfigured'),
    true,
    schema.boolean(),
    schema.never()
  ),
  // --- PreconfiguredAction
});
