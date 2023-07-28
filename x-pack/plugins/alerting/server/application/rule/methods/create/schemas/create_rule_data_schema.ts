/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { RuleActionTypes } from '../../../../../../common';
import { validateDuration } from '../../../validation';
import { notifyWhenSchema, actionAlertsFilterSchema } from '../../../schemas';

const defaultActionSchema = schema.object({
  group: schema.string(),
  id: schema.string(),
  actionTypeId: schema.maybe(schema.string()),
  params: schema.recordOf(schema.string(), schema.maybe(schema.any()), { defaultValue: {} }),
  frequency: schema.maybe(
    schema.object({
      summary: schema.boolean(),
      notifyWhen: notifyWhenSchema,
      throttle: schema.nullable(schema.string({ validate: validateDuration })),
    })
  ),
  uuid: schema.maybe(schema.string()),
  alertsFilter: schema.maybe(actionAlertsFilterSchema),
  type: schema.maybe(schema.literal(RuleActionTypes.DEFAULT)),
});

const systemAction = schema.object({
  id: schema.string(),
  actionTypeId: schema.string(),
  params: schema.recordOf(schema.string(), schema.maybe(schema.any()), { defaultValue: {} }),
  uuid: schema.maybe(schema.string()),
  type: schema.literal(RuleActionTypes.SYSTEM),
});

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
  actions: schema.arrayOf(schema.oneOf([defaultActionSchema, systemAction]), { defaultValue: [] }),
  notifyWhen: schema.maybe(schema.nullable(notifyWhenSchema)),
});
