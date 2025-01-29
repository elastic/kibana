/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

const getAllInvestigationTagsParamsSchema = z.object({
  query: z.object({}),
});

const getAllInvestigationTagsResponseSchema = z.string().array();

type GetAllInvestigationTagsResponse = z.output<typeof getAllInvestigationTagsResponseSchema>;

export { getAllInvestigationTagsParamsSchema, getAllInvestigationTagsResponseSchema };
export type { GetAllInvestigationTagsResponse };
