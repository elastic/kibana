/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

const SECONDS_REGEX = /^[1-9][0-9]*s$/;
const MINUTES_REGEX = /^[1-9][0-9]*m$/;
const HOURS_REGEX = /^[1-9][0-9]*h$/;
const DAYS_REGEX = /^[1-9][0-9]*d$/;
export function validateDuration(duration: string) {
  if (duration.match(SECONDS_REGEX)) {
    return;
  }
  if (duration.match(MINUTES_REGEX)) {
    return;
  }
  if (duration.match(HOURS_REGEX)) {
    return;
  }
  if (duration.match(DAYS_REGEX)) {
    return;
  }
  return 'string is not a valid duration: ' + duration;
}

export const taskSchemaV1 = schema.object({
  taskType: schema.string(),
  scheduledAt: schema.string(),
  startedAt: schema.nullable(schema.string()),
  retryAt: schema.nullable(schema.string()),
  runAt: schema.string(),
  schedule: schema.maybe(
    schema.object({
      interval: schema.string({ validate: validateDuration }),
    })
  ),
  params: schema.string(),
  state: schema.string(),
  stateVersion: schema.maybe(schema.number()),
  traceparent: schema.string(),
  user: schema.maybe(schema.string()),
  scope: schema.maybe(schema.arrayOf(schema.string())),
  ownerId: schema.nullable(schema.string()),
  enabled: schema.maybe(schema.boolean()),
  timeoutOverride: schema.maybe(schema.string()),
  attempts: schema.number(),
  status: schema.oneOf([
    schema.literal('idle'),
    schema.literal('claiming'),
    schema.literal('running'),
    schema.literal('failed'),
    schema.literal('unrecognized'),
    schema.literal('dead_letter'),
  ]),
  version: schema.maybe(schema.string()),
});

export const taskSchemaV2 = taskSchemaV1.extends({
  partition: schema.maybe(schema.number()),
});
