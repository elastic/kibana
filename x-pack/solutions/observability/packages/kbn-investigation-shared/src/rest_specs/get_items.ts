/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { investigationItemResponseSchema } from './investigation_item';

const getInvestigationItemsParamsSchema = z.object({
  path: z.object({
    investigationId: z.string(),
  }),
});

const getInvestigationItemsResponseSchema = z.array(investigationItemResponseSchema);

type GetInvestigationItemsResponse = z.output<typeof getInvestigationItemsResponseSchema>;

export { getInvestigationItemsParamsSchema, getInvestigationItemsResponseSchema };
export type { GetInvestigationItemsResponse };
