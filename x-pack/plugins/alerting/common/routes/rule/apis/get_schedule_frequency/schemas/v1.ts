/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const getScheduleFrequencyResponseBodySchema = schema.object({
  total_scheduled_per_minute: schema.number(),
  remaining_schedules_per_minute: schema.number(),
});

export const getScheduleFrequencyResponseSchema = schema.object({
  body: getScheduleFrequencyResponseBodySchema,
});
