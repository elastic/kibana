/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import { statusSchema } from '../schema';

const getAllInvestigationStatsParamsSchema = z.object({
  query: z.object({}),
});

const getAllInvestigationStatsResponseSchema = z.object({
  count: z.record(statusSchema, z.number()),
  total: z.number(),
});

type GetAllInvestigationStatsResponse = z.output<typeof getAllInvestigationStatsResponseSchema>;

export { getAllInvestigationStatsParamsSchema, getAllInvestigationStatsResponseSchema };
export type { GetAllInvestigationStatsResponse };
