/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { investigationResponseSchema } from './investigation';
import { statusSchema } from '../schema';

const updateInvestigationParamsSchema = z.object({
  path: z.object({
    investigationId: z.string(),
  }),
  body: z
    .object({
      title: z.string(),
      status: statusSchema,
      params: z.object({
        timeRange: z.object({ from: z.number(), to: z.number() }),
      }),
      tags: z.array(z.string()),
      externalIncidentUrl: z.string().nullable(),
      rootCauseAnalysis: z.object({
        events: z.array(z.any()),
      }),
    })
    .partial(),
});

const updateInvestigationResponseSchema = investigationResponseSchema;

type UpdateInvestigationParams = z.infer<typeof updateInvestigationParamsSchema.shape.body>;
type UpdateInvestigationResponse = z.output<typeof updateInvestigationResponseSchema>;

export { updateInvestigationParamsSchema, updateInvestigationResponseSchema };
export type { UpdateInvestigationParams, UpdateInvestigationResponse };
