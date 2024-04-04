/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { validateDuration } from '../../../validation';
import {
  notifyWhenSchema,
  alertDelaySchema,
  actionRequestSchema,
  systemActionRequestSchema,
} from '../../../schemas';

export const createRuleDataSchema = schema.object({
  name: schema.string(),
  alertTypeId: schema.string(),
  enabled: schema.boolean({ defaultValue: true }),
  consumer: schema.string(),
  tags: schema.arrayOf(schema.string(), { defaultValue: [] }),
  throttle: schema.maybe(schema.nullable(schema.string({ validate: validateDuration }))),
  params: schema.recordOf(schema.string(), schema.maybe(schema.any()), { defaultValue: {} }),
  schedule: schema.object({
    interval: schema.string({ validate: validateDuration }),
  }),
  actions: schema.arrayOf(actionRequestSchema, {
    defaultValue: [],
  }),
  systemActions: schema.maybe(
    schema.arrayOf(systemActionRequestSchema, {
      defaultValue: [],
    })
  ),
  notifyWhen: schema.maybe(schema.nullable(notifyWhenSchema)),
  alertDelay: schema.maybe(alertDelaySchema),
});
