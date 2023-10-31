/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { maintenanceWindowCategoryIdsSchemaV1 } from '../../../shared';
import { rRuleRequestSchemaV1 } from '../../../../r_rule';

export const updateParamsSchema = schema.object({
  id: schema.string(),
});

export const updateBodySchema = schema.object({
  title: schema.maybe(schema.string()),
  enabled: schema.maybe(schema.boolean()),
  duration: schema.maybe(schema.number()),
  r_rule: schema.maybe(rRuleRequestSchemaV1),
  category_ids: maintenanceWindowCategoryIdsSchemaV1,
});
