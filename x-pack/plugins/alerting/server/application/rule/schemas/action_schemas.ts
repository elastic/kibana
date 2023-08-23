/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { notifyWhenSchema } from './notify_when_schema';

export const actionParamsSchema = schema.recordOf(schema.string(), schema.maybe(schema.any()));

const actionAlertsFilterQueryFiltersSchema = schema.arrayOf(
  schema.object({
    query: schema.maybe(schema.recordOf(schema.string(), schema.any())),
    meta: schema.recordOf(schema.string(), schema.any()),
    state$: schema.maybe(schema.object({ store: schema.string() })),
  })
);

const actionDomainAlertsFilterQuerySchema = schema.object({
  kql: schema.string(),
  filters: actionAlertsFilterQueryFiltersSchema,
  dsl: schema.maybe(schema.string()),
});

const actionAlertsFilterTimeFrameSchema = schema.object({
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
    start: schema.string(),
    end: schema.string(),
  }),
  timezone: schema.string(),
});

const actionDomainAlertsFilterSchema = schema.object({
  query: schema.maybe(actionDomainAlertsFilterQuerySchema),
  timeframe: schema.maybe(actionAlertsFilterTimeFrameSchema),
});

const actionFrequencySchema = schema.object({
  summary: schema.boolean(),
  notifyWhen: notifyWhenSchema,
  throttle: schema.nullable(schema.string()),
});

/**
 * Unsanitized (domain) action schema, used by internal rules clients
 */
export const actionDomainSchema = schema.object({
  uuid: schema.maybe(schema.string()),
  group: schema.string(),
  id: schema.string(),
  actionTypeId: schema.string(),
  params: actionParamsSchema,
  frequency: schema.maybe(actionFrequencySchema),
  alertsFilter: schema.maybe(actionDomainAlertsFilterSchema),
});

/**
 * Sanitized (non-domain) action schema, returned by rules clients for other solutions
 */
const actionAlertsFilterQuerySchema = schema.object({
  kql: schema.string(),
  filters: actionAlertsFilterQueryFiltersSchema,
  dsl: schema.maybe(schema.string()),
});

export const actionAlertsFilterSchema = schema.object({
  query: schema.maybe(actionAlertsFilterQuerySchema),
  timeframe: schema.maybe(actionAlertsFilterTimeFrameSchema),
});

export const actionSchema = schema.object({
  uuid: schema.maybe(schema.string()),
  group: schema.string(),
  id: schema.string(),
  actionTypeId: schema.string(),
  params: actionParamsSchema,
  frequency: schema.maybe(actionFrequencySchema),
  alertsFilter: schema.maybe(actionAlertsFilterSchema),
});
