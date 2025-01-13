/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ingestReadStreamDefinitonSchema } from './ingest_read_stream';
import { wiredReadStreamDefinitonSchema } from './wired_read_stream';

export const readStreamDefinitonSchema = z.union([
  wiredReadStreamDefinitonSchema,
  ingestReadStreamDefinitonSchema,
]);

export type ReadStreamDefinition = z.infer<typeof readStreamDefinitonSchema>;
