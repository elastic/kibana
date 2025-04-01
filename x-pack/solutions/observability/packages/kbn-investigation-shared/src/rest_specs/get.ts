/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { investigationResponseSchema } from './investigation';

const getInvestigationParamsSchema = z.object({
  path: z.object({
    investigationId: z.string(),
  }),
});

const getInvestigationResponseSchema = investigationResponseSchema;

type GetInvestigationParams = z.infer<typeof getInvestigationParamsSchema.shape.path>; // Parsed payload used by the backend
type GetInvestigationResponse = z.output<typeof getInvestigationResponseSchema>; // Raw response sent to the frontend

export { getInvestigationParamsSchema, getInvestigationResponseSchema };
export type { GetInvestigationParams, GetInvestigationResponse };
