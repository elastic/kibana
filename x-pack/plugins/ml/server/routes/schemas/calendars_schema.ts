/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const calendarSchema = schema.object({
  calendarId: schema.string(),
  job_ids: schema.arrayOf(schema.string()),
  description: schema.maybe(schema.string()),
  total_job_count: schema.maybe(schema.number()),
  events: schema.arrayOf(
    schema.object({
      event_id: schema.string(),
      calendar_id: schema.string(),
      description: schema.string(),
      start_time: schema.string(),
      end_time: schema.string(),
    })
  ),
});

export const updateCalendarSchema = schema.object({
  calendar_id: schema.string(),
  job_ids: schema.arrayOf(schema.string()),
  description: schema.maybe(schema.string()),
  total_job_count: schema.maybe(schema.number()),
  events: schema.arrayOf(
    schema.object({
      event_id: schema.string(),
      calendar_id: schema.string(),
      description: schema.string(),
      start_time: schema.string(),
      end_time: schema.string(),
    })
  ),
});

export const calendarIdSchema = schema.object({ calendarId: schema.string() });

export const calendarIdsSchema = schema.object({
  /** Comma-separated list of calendar IDs */
  calendarIds: schema.string(),
});
