/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const scheduleAdHocRuleRunRequestBodySchema = schema.object({
  rule_ids: schema.arrayOf(schema.string(), { minSize: 1 }),
  interval_start: schema.string(),
  interval_duration: schema.string(),
  interval_end: schema.maybe(schema.string()),
});

export const scheduleAdHocRuleRunResponseBodySchema = schema.object({});
