/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { investigationResponseSchema } from './investigation';

const findInvestigationsParamsSchema = z
  .object({
    query: z
      .object({
        alertId: z.string(),
        search: z.string(),
        filter: z.string(),
        page: z.coerce.number(),
        perPage: z.coerce.number(),
      })
      .partial(),
  })
  .partial();

const findInvestigationsResponseSchema = z.object({
  page: z.number(),
  perPage: z.number(),
  total: z.number(),
  results: z.array(investigationResponseSchema),
});

type FindInvestigationsParams = z.infer<typeof findInvestigationsParamsSchema.shape.query>;
type FindInvestigationsResponse = z.output<typeof findInvestigationsResponseSchema>;

export { findInvestigationsParamsSchema, findInvestigationsResponseSchema };
export type { FindInvestigationsParams, FindInvestigationsResponse };
