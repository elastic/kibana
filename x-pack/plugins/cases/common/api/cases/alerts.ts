/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from 'zod';

const AlertSchema = z
  .object({
    id: z.string(),
    index: z.string(),
    attached_at: z.string(),
  })
  .strict();

const AlertResponseSchema = z.array(AlertSchema);
export type AlertResponse = z.infer<typeof AlertResponseSchema>;
