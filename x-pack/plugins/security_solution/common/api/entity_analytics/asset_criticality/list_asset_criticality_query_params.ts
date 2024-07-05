/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from 'zod';

export const ListAssetCriticalityQueryParams = z.object({
  page: z.coerce.number().min(1).optional(),
  per_page: z.coerce.number().min(1).max(10000).optional(),
  sort_field: z.enum(['id_field', 'id_value', '@timestamp', 'criticality_level']).optional(),
  sort_direction: z.enum(['asc', 'desc']).optional(),
  kuery: z.string().optional(),
});

export type ListAssetCriticalityQueryParams = z.infer<typeof ListAssetCriticalityQueryParams>;
