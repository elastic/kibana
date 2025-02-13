/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { entityWithSourceSchema } from './entity';

const getEntitiesParamsSchema = z
  .object({
    query: z
      .object({
        'service.name': z.string(),
        'service.environment': z.string(),
        'host.name': z.string(),
        'container.id': z.string(),
      })
      .partial(),
  })
  .partial();

const getEntitiesResponseSchema = z.object({
  entities: z.array(entityWithSourceSchema),
});

type GetEntitiesParams = z.infer<typeof getEntitiesParamsSchema.shape.query>;
type GetEntitiesResponse = z.output<typeof getEntitiesResponseSchema>;

export { getEntitiesParamsSchema, getEntitiesResponseSchema };
export type { GetEntitiesParams, GetEntitiesResponse };
