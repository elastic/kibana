/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { rawRuleSchema as rawRuleSchemaV1 } from './v1';

export const flappingSchema = schema.object({
  lookBackWindow: schema.number(),
  statusChangeThreshold: schema.number(),
});

export const rawRuleSchema = rawRuleSchemaV1.extends({
  flapping: schema.maybe(schema.nullable(flappingSchema)),
});
