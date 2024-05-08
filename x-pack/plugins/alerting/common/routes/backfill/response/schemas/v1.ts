/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { adHocRunStatus } from '../../../../constants';

export const statusSchema = schema.oneOf([
  schema.literal(adHocRunStatus.COMPLETE),
  schema.literal(adHocRunStatus.PENDING),
  schema.literal(adHocRunStatus.RUNNING),
  schema.literal(adHocRunStatus.ERROR),
  schema.literal(adHocRunStatus.TIMEOUT),
]);

export const backfillResponseSchema = schema.object({
  id: schema.string(),
  created_at: schema.string(),
  duration: schema.string(),
  enabled: schema.boolean(),
  rule: schema.object({
    id: schema.string(),
    name: schema.string(),
    tags: schema.arrayOf(schema.string()),
    rule_type_id: schema.string(),
    params: schema.recordOf(schema.string(), schema.maybe(schema.any())),
    api_key_owner: schema.nullable(schema.string()),
    api_key_created_by_user: schema.maybe(schema.nullable(schema.boolean())),
    consumer: schema.string(),
    enabled: schema.boolean(),
    schedule: schema.object({ interval: schema.string() }),
    created_by: schema.nullable(schema.string()),
    updated_by: schema.nullable(schema.string()),
    created_at: schema.string(),
    updated_at: schema.string(),
    revision: schema.number(),
  }),
  space_id: schema.string(),
  start: schema.string(),
  status: statusSchema,
  end: schema.maybe(schema.string()),
  schedule: schema.arrayOf(
    schema.object({
      run_at: schema.string(),
      status: statusSchema,
      interval: schema.string(),
    })
  ),
});

export const errorResponseSchema = schema.object({
  error: schema.object({
    error: schema.string(),
    message: schema.string(),
  }),
});
