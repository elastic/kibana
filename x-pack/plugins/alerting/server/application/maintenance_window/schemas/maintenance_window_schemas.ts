/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { maintenanceWindowStatus } from '../constants';
import { rRuleSchema } from '../../r_rule/schemas';

export const maintenanceWindowEventSchema = schema.object({
  gte: schema.string(),
  lte: schema.string(),
});

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
});
