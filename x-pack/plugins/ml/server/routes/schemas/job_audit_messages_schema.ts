/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';

export const jobIdSchema = schema.object({ jobId: schema.maybe(schema.string()) });

export const jobAuditMessagesQuerySchema = schema.maybe(
  schema.object({ from: schema.maybe(schema.any()) })
);
