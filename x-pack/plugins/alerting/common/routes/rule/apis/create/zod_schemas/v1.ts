/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as z from 'zod';
import {
  customThresholdZodParamsSchemaV1,
  metricThresholdZodParamsSchemaV1,
  esQueryZodParamsSchemaV1,
} from '@kbn/rule-data-utils';
import { validateDurationV1, validateHoursV1, validateTimezoneV1 } from '../../../validation';
import { notifyWhenZodSchemaV1, alertDelayZodSchemaV1 } from '../../../response';
import { alertsFilterQueryZodSchemaV1 } from '../../../../alerts_filter_query';

export const ruleParamsZodSchema = z.union([
  customThresholdZodParamsSchemaV1.describe('Custom threshold rule type params'),
  metricThresholdZodParamsSchemaV1.describe('Metric threshold rule type params'),
  esQueryZodParamsSchemaV1.describe('ES query rule type params'),
]);

export const actionFrequencyZodSchema = z.object({
  summary: z.boolean(),
  notify_when: notifyWhenZodSchemaV1,
  throttle: z.nullable(z.string().superRefine(validateDurationV1)),
});

export const actionAlertsFilterZodSchema = z.object({
  query: z.optional(alertsFilterQueryZodSchemaV1),
  timeframe: z.optional(
    z.object({
      days: z.array(
        z.union([
          z.literal(1),
          z.literal(2),
          z.literal(3),
          z.literal(4),
          z.literal(5),
          z.literal(6),
          z.literal(7),
        ])
      ),
      hours: z.object({
        start: z.string().superRefine(validateHoursV1),
        end: z.string().superRefine(validateHoursV1),
      }),
      timezone: z.string().superRefine(validateTimezoneV1),
    })
  ),
});

export const actionZodSchema = z.object({
  uuid: z.optional(z.string()),
  group: z.string(),
  id: z.string(),
  actionTypeId: z.optional(z.string()),
  params: z.record(z.optional(z.any())).default({}),
  frequency: z.optional(actionFrequencyZodSchema),
  alerts_filter: z.optional(actionAlertsFilterZodSchema),
  use_alert_data_for_template: z.optional(z.boolean()),
});

export const createBodyZodSchema = z.object({
  name: z.string(),
  rule_type_id: z.string(),
  enabled: z.boolean().default(true),
  consumer: z.string(),
  tags: z.array(z.string()).default([]),
  throttle: z.optional(z.nullable(z.string().superRefine(validateDurationV1))),
  params: ruleParamsZodSchema,
  schedule: z.object({
    interval: z.string().superRefine(validateDurationV1),
  }),
  actions: z.array(actionZodSchema).default([]),
  notify_when: z.optional(z.nullable(notifyWhenZodSchemaV1)),
  alert_delay: z.optional(alertDelayZodSchemaV1),
});

export const createParamsZodSchema = z.object({
  id: z.optional(z.string()),
});
