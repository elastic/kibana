/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { validateDurationV1, validateHoursV1, validateTimezoneV1 } from '../../../validation';
import { notifyWhenSchemaV1, alertDelaySchemaV1 } from '../../../response';
import { alertsFilterQuerySchemaV1 } from '../../../../alerts_filter_query';

export const actionFrequencySchema = schema.object({
  summary: schema.boolean(),
  notify_when: notifyWhenSchemaV1,
  throttle: schema.nullable(schema.string({ validate: validateDurationV1 })),
});

export const actionAlertsFilterSchema = schema.object({
  query: schema.maybe(alertsFilterQuerySchemaV1),
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
  group: schema.maybe(schema.string()),
  id: schema.string(),
  params: schema.recordOf(schema.string(), schema.maybe(schema.any()), { defaultValue: {} }),
  frequency: schema.maybe(actionFrequencySchema),
  uuid: schema.maybe(schema.string()),
  alerts_filter: schema.maybe(actionAlertsFilterSchema),
  use_alert_data_for_template: schema.maybe(schema.boolean()),
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
  notify_when: schema.maybe(schema.nullable(notifyWhenSchemaV1)),
  alert_delay: schema.maybe(alertDelaySchemaV1),
});

export const createParamsSchema = schema.object({
  id: schema.maybe(schema.string()),
});
