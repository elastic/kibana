/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';

export const calendarSchema = schema.object({
  calendar_id: schema.maybe(schema.string()),
  calendarId: schema.string(),
  job_ids: schema.arrayOf(schema.maybe(schema.string())),
  description: schema.maybe(schema.string()),
  total_job_count: schema.maybe(schema.number()),
  events: schema.arrayOf(
    schema.maybe(
      schema.object({
        event_id: schema.maybe(schema.string()),
        calendar_id: schema.maybe(schema.string()),
        description: schema.maybe(schema.string()),
        start_time: schema.any(),
        end_time: schema.any(),
      })
    )
  ),
});

export const calendarIdSchema = schema.object({ calendarId: schema.string() });

export const calendarIdsSchema = schema.object({
  /** Comma-separated list of calendar IDs */
  calendarIds: schema.string(),
});
