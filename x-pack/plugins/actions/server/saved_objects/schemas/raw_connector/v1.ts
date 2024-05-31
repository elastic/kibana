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
  config: schema.any({ defaultValue: {} }),
  secrets: schema.any({ defaultValue: {} }),

  isPreconfigured: schema.maybe(schema.boolean()),
  isSystemAction: schema.maybe(schema.boolean()),
  id: schema.maybe(schema.string()),
  isDeprecated: schema.maybe(schema.boolean()),
});
