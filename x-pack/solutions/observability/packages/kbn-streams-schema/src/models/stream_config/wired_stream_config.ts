/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { fieldDefinitionSchema, processingDefinitionSchema, streamChildSchema } from '../common';

export const wiredStreamConfigDefinitonSchema = z
  .object({
    ingest: z.object({
      processing: z.array(processingDefinitionSchema),
      wired: z.object({
        fields: fieldDefinitionSchema,
      }),
      routing: z.array(streamChildSchema),
    }),
  })
  .strict();

export type WiredStreamConfigDefinition = z.infer<typeof wiredStreamConfigDefinitonSchema>;
