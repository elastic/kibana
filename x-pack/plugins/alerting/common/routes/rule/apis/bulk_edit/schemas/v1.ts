/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { validateDurationV1, validateNotifyWhenV1 } from '../../../validation';
import { validateSnoozeScheduleV1 } from '../validation';
import { rRuleSchemaV1 } from '../../../../r_rule';
import { ruleNotifyWhenV1 } from '../../../response';

const notifyWhenSchema = schema.oneOf(
  [
    schema.literal(ruleNotifyWhenV1.CHANGE),
    schema.literal(ruleNotifyWhenV1.ACTIVE),
    schema.literal(ruleNotifyWhenV1.THROTTLE),
  ],
  { validate: validateNotifyWhenV1 }
);

export const scheduleIdsSchema = schema.maybe(schema.arrayOf(schema.string()));

export const ruleSnoozeScheduleSchema = schema.object({
  id: schema.maybe(schema.string()),
  duration: schema.number(),
  rRule: rRuleSchemaV1,
});

const ruleSnoozeScheduleSchemaWithValidation = schema.object(
  {
    id: schema.maybe(schema.string()),
    duration: schema.number(),
    rRule: rRuleSchemaV1,
  },
  { validate: validateSnoozeScheduleV1 }
);

const ruleActionSchema = schema.object({
  group: schema.string(),
  id: schema.string(),
  params: schema.recordOf(schema.string(), schema.any(), { defaultValue: {} }),
  uuid: schema.maybe(schema.string()),
  frequency: schema.maybe(
    schema.object({
      summary: schema.boolean(),
      throttle: schema.nullable(schema.string()),
      notifyWhen: notifyWhenSchema,
    })
  ),
});

export const bulkEditOperationsSchema = schema.arrayOf(
  schema.oneOf([
    schema.object({
      operation: schema.oneOf([
        schema.literal('add'),
        schema.literal('delete'),
        schema.literal('set'),
      ]),
      field: schema.literal('tags'),
      value: schema.arrayOf(schema.string()),
    }),
    schema.object({
      operation: schema.oneOf([schema.literal('add'), schema.literal('set')]),
      field: schema.literal('actions'),
      value: schema.arrayOf(ruleActionSchema),
    }),
    schema.object({
      operation: schema.literal('set'),
      field: schema.literal('schedule'),
      value: schema.object({ interval: schema.string({ validate: validateDurationV1 }) }),
    }),
    schema.object({
      operation: schema.literal('set'),
      field: schema.literal('throttle'),
      value: schema.nullable(schema.string()),
    }),
    schema.object({
      operation: schema.literal('set'),
      field: schema.literal('notifyWhen'),
      value: notifyWhenSchema,
    }),
    schema.object({
      operation: schema.oneOf([schema.literal('set')]),
      field: schema.literal('snoozeSchedule'),
      value: ruleSnoozeScheduleSchemaWithValidation,
    }),
    schema.object({
      operation: schema.oneOf([schema.literal('delete')]),
      field: schema.literal('snoozeSchedule'),
      value: schema.maybe(scheduleIdsSchema),
    }),
    schema.object({
      operation: schema.literal('set'),
      field: schema.literal('apiKey'),
    }),
  ]),
  { minSize: 1 }
);

export const bulkEditRulesRequestBodySchema = schema.object({
  filter: schema.maybe(schema.string()),
  ids: schema.maybe(schema.arrayOf(schema.string(), { minSize: 1 })),
  operations: bulkEditOperationsSchema,
});
