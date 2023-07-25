/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { rRuleRequestSchema } from '../../../../r_rule/schemas';

export const createMaintenanceWindowDataSchema = schema.object({
  title: schema.string(),
  duration: schema.number(),
  rRule: rRuleRequestSchema,
});
