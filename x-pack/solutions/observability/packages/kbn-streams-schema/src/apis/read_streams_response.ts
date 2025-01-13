/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { readStreamDefinitonSchema } from '../models';

export const readStreamResponseSchema = z.object({
  streams: z.array(readStreamDefinitonSchema),
});

export type ReadStreamResponse = z.infer<typeof readStreamResponseSchema>;
