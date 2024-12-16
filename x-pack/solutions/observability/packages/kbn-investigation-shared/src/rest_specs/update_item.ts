/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { investigationItemResponseSchema } from './investigation_item';
import { itemSchema } from '../schema';

const updateInvestigationItemParamsSchema = z.object({
  path: z.object({
    investigationId: z.string(),
    itemId: z.string(),
  }),
  body: itemSchema,
});

const updateInvestigationItemResponseSchema = investigationItemResponseSchema;

type UpdateInvestigationItemParams = z.infer<typeof updateInvestigationItemParamsSchema.shape.body>;
type UpdateInvestigationItemResponse = z.output<typeof updateInvestigationItemResponseSchema>;

export { updateInvestigationItemParamsSchema, updateInvestigationItemResponseSchema };
export type { UpdateInvestigationItemParams, UpdateInvestigationItemResponse };
