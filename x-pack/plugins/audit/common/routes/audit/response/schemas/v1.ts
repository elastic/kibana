/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const auditLogOperation = schema.oneOf([
  schema.literal('create'),
  schema.literal('update'),
  schema.literal('delete'),
  schema.literal('get'),
]);

export const auditLog = schema.object({
  '@timestamp': schema.string(),
  id: schema.string(),
  namespace: schema.string(),
  user: schema.string(),
  operation: auditLogOperation,
  subject: schema.string(),
  subject_id: schema.string(),
  data: schema.object({
    old: schema.nullable(schema.any()),
    new: schema.nullable(schema.any()),
  }),
});

export const findAuditResponse = schema.object({
  page: schema.number(),
  per_page: schema.number(),
  total: schema.number(),
  data: schema.arrayOf(auditLog),
});
