/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { processingDefinitionSchema, streamChildSchema } from '../common';

export const ingestStreamConfigDefinitonSchema = z
  .object({
    ingest: z.object({
      processing: z.array(processingDefinitionSchema).default([]),
      routing: z.array(streamChildSchema).default([]),
    }),
  })
  .strict();

export type IngestStreamConfigDefinition = z.infer<typeof ingestStreamConfigDefinitonSchema>;
