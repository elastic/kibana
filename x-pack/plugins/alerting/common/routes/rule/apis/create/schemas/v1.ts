/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { ruleNotifyWhenV1 } from '../../../response';
import {
  validateNotifyWhenV1,
  validateDurationV1,
  validateHoursV1,
  validateTimezoneV1,
} from '../../../validation';

export const notifyWhenSchema = schema.oneOf(
  [
    schema.literal(ruleNotifyWhenV1.CHANGE),
    schema.literal(ruleNotifyWhenV1.ACTIVE),
    schema.literal(ruleNotifyWhenV1.THROTTLE),
  ],
  { validate: validateNotifyWhenV1 }
);

export const actionFrequencySchema = schema.object({
  summary: schema.boolean(),
  notify_when: notifyWhenSchema,
  throttle: schema.nullable(schema.string({ validate: validateDurationV1 })),
});

export const actionAlertsFilterSchema = schema.object({
  query: schema.maybe(
    schema.object({
      kql: schema.string(),
      filters: schema.arrayOf(
        schema.object({
          query: schema.maybe(schema.recordOf(schema.string(), schema.any())),
          meta: schema.recordOf(schema.string(), schema.any()),
          state$: schema.maybe(schema.object({ store: schema.string() })),
        })
      ),
      dsl: schema.maybe(schema.string()),
    })
  ),
  timeframe: schema.maybe(
    schema.object({
      days: schema.arrayOf(
        schema.oneOf([
          schema.literal(1),
          schema.literal(2),
          schema.literal(3),
          schema.literal(4),
          schema.literal(5),
          schema.literal(6),
          schema.literal(7),
        ])
      ),
      hours: schema.object({
        start: schema.string({
          validate: validateHoursV1,
        }),
        end: schema.string({
          validate: validateHoursV1,
        }),
      }),
      timezone: schema.string({ validate: validateTimezoneV1 }),
    })
  ),
});

export const actionSchema = schema.object({
  uuid: schema.maybe(schema.string()),
  group: schema.string(),
  id: schema.string(),
  actionTypeId: schema.maybe(schema.string()),
  params: schema.recordOf(schema.string(), schema.maybe(schema.any()), { defaultValue: {} }),
  frequency: schema.maybe(actionFrequencySchema),
  alerts_filter: schema.maybe(actionAlertsFilterSchema),
});

export const createBodySchema = schema.object({
  name: schema.string(),
  rule_type_id: schema.string(),
  enabled: schema.boolean({ defaultValue: true }),
  consumer: schema.string(),
  tags: schema.arrayOf(schema.string(), { defaultValue: [] }),
  throttle: schema.maybe(schema.nullable(schema.string({ validate: validateDurationV1 }))),
  params: schema.recordOf(schema.string(), schema.maybe(schema.any()), { defaultValue: {} }),
  schedule: schema.object({
    interval: schema.string({ validate: validateDurationV1 }),
  }),
  actions: schema.arrayOf(actionSchema, { defaultValue: [] }),
  notify_when: schema.maybe(schema.nullable(notifyWhenSchema)),
});

export const createParamsSchema = schema.object({
  id: schema.maybe(schema.string()),
});
