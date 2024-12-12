/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { investigationNoteResponseSchema } from './investigation_note';

const createInvestigationNoteParamsSchema = z.object({
  path: z.object({
    investigationId: z.string(),
  }),
  body: z.object({
    content: z.string(),
  }),
});

const createInvestigationNoteResponseSchema = investigationNoteResponseSchema;

type CreateInvestigationNoteParams = z.infer<typeof createInvestigationNoteParamsSchema.shape.body>;
type CreateInvestigationNoteResponse = z.output<typeof createInvestigationNoteResponseSchema>;

export { createInvestigationNoteParamsSchema, createInvestigationNoteResponseSchema };
export type { CreateInvestigationNoteParams, CreateInvestigationNoteResponse };
