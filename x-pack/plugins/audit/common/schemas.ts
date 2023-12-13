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
  namespace: schema.string(),
  id: schema.string(),
  '@timestamp': schema.string(),
  user: schema.string(),
  operation: auditLogOperation,
  subject: schema.string(),
  subjectId: schema.string(),
  data: schema.object({
    old: schema.any(),
    new: schema.any(),
  }),
});
