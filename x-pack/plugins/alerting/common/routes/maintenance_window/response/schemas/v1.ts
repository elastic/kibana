/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { maintenanceWindowStatusV1 } from '..';
import { maintenanceWindowCategoryIdsSchemaV1 } from '../../shared';
import { rRuleResponseSchemaV1 } from '../../../r_rule';
import { alertsFilterQuerySchemaV1 } from '../../../alerts_filter_query';

export const maintenanceWindowEventSchema = schema.object({
  gte: schema.string(),
  lte: schema.string(),
});

export const maintenanceWindowResponseSchema = schema.object({
  id: schema.string(),
  title: schema.string(),
  enabled: schema.boolean(),
  duration: schema.number(),
  expiration_date: schema.string(),
  events: schema.arrayOf(maintenanceWindowEventSchema),
  r_rule: rRuleResponseSchemaV1,
  created_by: schema.nullable(schema.string()),
  updated_by: schema.nullable(schema.string()),
  created_at: schema.string(),
  updated_at: schema.string(),
  event_start_time: schema.nullable(schema.string()),
  event_end_time: schema.nullable(schema.string()),
  status: schema.oneOf([
    schema.literal(maintenanceWindowStatusV1.RUNNING),
    schema.literal(maintenanceWindowStatusV1.UPCOMING),
    schema.literal(maintenanceWindowStatusV1.FINISHED),
    schema.literal(maintenanceWindowStatusV1.ARCHIVED),
  ]),
  category_ids: maintenanceWindowCategoryIdsSchemaV1,
  scoped_query: schema.maybe(schema.nullable(alertsFilterQuerySchemaV1)),
});
