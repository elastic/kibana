/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

const rawAdHocRunStatus = schema.oneOf([
  schema.literal('complete'),
  schema.literal('pending'),
  schema.literal('running'),
  schema.literal('error'),
  schema.literal('timeout'),
]);

const rawAdHocRunSchedule = schema.object({
  interval: schema.string(),
  status: rawAdHocRunStatus,
  runAt: schema.string(),
});

const rawAdHocRunParamsRuleSchema = schema.object({
  name: schema.string(),
  tags: schema.arrayOf(schema.string()),
  alertTypeId: schema.string(),
  params: schema.recordOf(schema.string(), schema.maybe(schema.any())),
  apiKeyOwner: schema.nullable(schema.string()),
  apiKeyCreatedByUser: schema.maybe(schema.nullable(schema.boolean())),
  consumer: schema.string(),
  enabled: schema.boolean(),
  schedule: schema.object({
    interval: schema.string(),
  }),
  createdBy: schema.nullable(schema.string()),
  updatedBy: schema.nullable(schema.string()),
  updatedAt: schema.string(),
  createdAt: schema.string(),
  revision: schema.number(),
});

export const rawAdHocRunParamsSchema = schema.object({
  apiKeyId: schema.string(),
  apiKeyToUse: schema.string(),
  createdAt: schema.string(),
  duration: schema.string(),
  enabled: schema.boolean(),
  end: schema.maybe(schema.string()),
  rule: rawAdHocRunParamsRuleSchema,
  spaceId: schema.string(),
  start: schema.string(),
  status: rawAdHocRunStatus,
  schedule: schema.arrayOf(rawAdHocRunSchedule),
});
