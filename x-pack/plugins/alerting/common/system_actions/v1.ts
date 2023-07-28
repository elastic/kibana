/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { RuleActionTypes } from '../rule';

export const systemActionSchema = schema.object({
  id: schema.string(),
  actionTypeId: schema.string(),
  params: schema.recordOf(schema.string(), schema.maybe(schema.any()), { defaultValue: {} }),
  uuid: schema.string(),
  type: schema.literal(RuleActionTypes.SYSTEM),
});

/**
 * actionTypeId is missing
 */
export const updateSystemActionSchema = schema.object({
  id: schema.string(),
  params: schema.recordOf(schema.string(), schema.maybe(schema.any()), { defaultValue: {} }),
  uuid: schema.string(),
  type: schema.literal(RuleActionTypes.SYSTEM),
});
