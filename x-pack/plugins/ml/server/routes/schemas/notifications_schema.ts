/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';

export const getNotificationsQuerySchema = schema.object({
  /**
   * Message level, e.g. info, error
   */
  level: schema.maybe(schema.string()),
  /**
   * Message type, e.g. anomaly_detector
   */
  type: schema.maybe(schema.string()),
  /**
   * Search string for the message content
   */
  queryString: schema.maybe(schema.string()),
  /**
   * Page numer, zero-indexed
   */
  from: schema.number({ defaultValue: 0 }),
  /**
   * Number of messages to return
   */
  size: schema.number({ defaultValue: 10 }),
  /**
   * Sort field
   */
  sortField: schema.oneOf(
    [
      schema.literal('timestamp'),
      schema.literal('level'),
      schema.literal('job_type'),
      schema.literal('job_id'),
    ],
    {
      defaultValue: 'timestamp',
    }
  ),
  /**
   * Sort direction
   */
  sortDirection: schema.oneOf([schema.literal('asc'), schema.literal('desc')], {
    defaultValue: 'desc',
  }),
  earliest: schema.maybe(schema.string()),
  latest: schema.maybe(schema.string()),
});

export const getNotificationsCountQuerySchema = schema.object({
  lastCheckedAt: schema.number(),
});

export type MessagesSearchParams = TypeOf<typeof getNotificationsQuerySchema>;

export type NotificationsCountParams = TypeOf<typeof getNotificationsCountQuerySchema>;
