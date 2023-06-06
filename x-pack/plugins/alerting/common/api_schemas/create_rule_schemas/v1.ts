/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { validateDuration } from '../validation/validate_duration/v1';
import { validateHours } from '../validation/validate_hours/v1';
import { validateNotifyWhen } from '../validation/validate_notify_when/v1';
import { validateTimezone } from '../validation/validate_timezone/v1';
import { RuleNotifyWhen } from '../rule_response_schemas/v1';

export const notifyWhenSchema = schema.oneOf(
  [
    schema.literal(RuleNotifyWhen.CHANGE),
    schema.literal(RuleNotifyWhen.ACTIVE),
    schema.literal(RuleNotifyWhen.THROTTLE),
  ],
  { validate: validateNotifyWhen }
);

export const actionFrequencySchema = schema.object({
  summary: schema.boolean(),
  notify_when: notifyWhenSchema,
  throttle: schema.nullable(schema.string({ validate: validateDuration })),
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
          validate: validateHours,
        }),
        end: schema.string({
          validate: validateHours,
        }),
      }),
      timezone: schema.string({ validate: validateTimezone }),
    })
  ),
});

export const actionSchema = schema.object({
  group: schema.string(),
  id: schema.string(),
  params: schema.recordOf(schema.string(), schema.any(), { defaultValue: {} }),
  frequency: schema.maybe(actionFrequencySchema),
  uuid: schema.maybe(schema.string()),
  alerts_filter: schema.maybe(actionAlertsFilterSchema),
});

export const createBodySchema = schema.object({
  name: schema.string(),
  rule_type_id: schema.string(),
  enabled: schema.boolean({ defaultValue: true }),
  consumer: schema.string(),
  tags: schema.arrayOf(schema.string(), { defaultValue: [] }),
  throttle: schema.maybe(schema.nullable(schema.string({ validate: validateDuration }))),
  params: schema.recordOf(schema.string(), schema.any(), { defaultValue: {} }),
  schedule: schema.object({
    interval: schema.string({ validate: validateDuration }),
  }),
  actions: schema.arrayOf(actionSchema, { defaultValue: [] }),
  notify_when: schema.maybe(schema.nullable(notifyWhenSchema)),
});

export const createParamsSchema = schema.object({
  id: schema.maybe(schema.string()),
});
