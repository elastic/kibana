/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { maintenanceWindowStatus, maintenanceWindowCategoryIdTypes } from '../constants';
import { rRuleSchema } from '../../r_rule/schemas';
import { alertsFilterQuerySchema } from '../../alerts_filter_query/schemas';

export const maintenanceWindowEventSchema = schema.object({
  gte: schema.string(),
  lte: schema.string(),
});

export const maintenanceWindowCategoryIdsSchema = schema.maybe(
  schema.nullable(
    schema.arrayOf(
      schema.oneOf([
        schema.literal(maintenanceWindowCategoryIdTypes.OBSERVABILITY),
        schema.literal(maintenanceWindowCategoryIdTypes.SECURITY_SOLUTION),
        schema.literal(maintenanceWindowCategoryIdTypes.MANAGEMENT),
      ])
    )
  )
);

export const maintenanceWindowSchema = schema.object({
  id: schema.string(),
  title: schema.string(),
  enabled: schema.boolean(),
  duration: schema.number(),
  expirationDate: schema.string(),
  events: schema.arrayOf(maintenanceWindowEventSchema),
  rRule: rRuleSchema,
  createdBy: schema.nullable(schema.string()),
  updatedBy: schema.nullable(schema.string()),
  createdAt: schema.string(),
  updatedAt: schema.string(),
  eventStartTime: schema.nullable(schema.string()),
  eventEndTime: schema.nullable(schema.string()),
  status: schema.oneOf([
    schema.literal(maintenanceWindowStatus.RUNNING),
    schema.literal(maintenanceWindowStatus.UPCOMING),
    schema.literal(maintenanceWindowStatus.FINISHED),
    schema.literal(maintenanceWindowStatus.ARCHIVED),
  ]),
  categoryIds: maintenanceWindowCategoryIdsSchema,
  scopedQuery: schema.maybe(schema.nullable(alertsFilterQuerySchema)),
});
