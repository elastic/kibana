/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { itemSchema } from '../schema';
import { investigationItemResponseSchema } from './investigation_item';

const createInvestigationItemParamsSchema = z.object({
  path: z.object({
    investigationId: z.string(),
  }),
  body: itemSchema,
});

const createInvestigationItemResponseSchema = investigationItemResponseSchema;

type CreateInvestigationItemParams = z.infer<typeof createInvestigationItemParamsSchema.shape.body>;
type CreateInvestigationItemResponse = z.output<typeof createInvestigationItemResponseSchema>;

export { createInvestigationItemParamsSchema, createInvestigationItemResponseSchema };
export type { CreateInvestigationItemParams, CreateInvestigationItemResponse };
