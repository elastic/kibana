/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { investigationResponseSchema } from './investigation';
import { alertOriginSchema, blankOriginSchema } from '../schema';

const createInvestigationParamsSchema = z.object({
  body: z.object({
    id: z.string(),
    title: z.string(),
    params: z.object({
      timeRange: z.object({ from: z.number(), to: z.number() }),
    }),
    origin: z.union([alertOriginSchema, blankOriginSchema]),
    tags: z.array(z.string()),
    externalIncidentUrl: z.string().nullable(),
  }),
});

const createInvestigationResponseSchema = investigationResponseSchema;

type CreateInvestigationParams = z.infer<typeof createInvestigationParamsSchema.shape.body>;
type CreateInvestigationResponse = z.output<typeof createInvestigationResponseSchema>;

export { createInvestigationParamsSchema, createInvestigationResponseSchema };
export type { CreateInvestigationParams, CreateInvestigationResponse };
