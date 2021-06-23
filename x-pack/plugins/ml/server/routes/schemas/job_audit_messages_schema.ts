/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const jobAuditMessagesJobIdSchema = schema.object({
  /** Job ID. */
  jobId: schema.maybe(schema.string()),
});

export const jobAuditMessagesQuerySchema = schema.object({ from: schema.maybe(schema.string()) });
