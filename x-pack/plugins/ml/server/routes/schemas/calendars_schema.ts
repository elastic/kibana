/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const calendarSchema = schema.object({
  calendarId: schema.string(),
  calendar_id: schema.maybe(schema.string()),
  job_ids: schema.arrayOf(schema.string()),
  description: schema.maybe(schema.string()),
  total_job_count: schema.maybe(schema.number()),
  events: schema.arrayOf(
    schema.object({
      event_id: schema.maybe(schema.string()),
      calendar_id: schema.maybe(schema.string()),
      description: schema.maybe(schema.string()),
      start_time: schema.oneOf([schema.string(), schema.number()]),
      end_time: schema.oneOf([schema.string(), schema.number()]),
      skip_result: schema.maybe(schema.boolean()),
      skip_model_update: schema.maybe(schema.boolean()),
      force_time_shift: schema.maybe(schema.number()),
    })
  ),
});

export const calendarIdSchema = schema.object({ calendarId: schema.string() });

export const calendarIdsSchema = schema.object({
  calendarIds: schema.string({ meta: { description: 'Comma-separated list of calendar IDs' } }),
});
