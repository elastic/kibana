/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { eventResponseSchema } from './event';

const getEventsParamsSchema = z
  .object({
    query: z
      .object({
        rangeFrom: z.string(),
        rangeTo: z.string(),
        filter: z.string(),
      })
      .partial(),
  })
  .partial();

const getEventsResponseSchema = z.array(eventResponseSchema);

type GetEventsParams = z.infer<typeof getEventsParamsSchema.shape.query>;
type GetEventsResponse = z.output<typeof getEventsResponseSchema>;

export { getEventsParamsSchema, getEventsResponseSchema };
export type { GetEventsParams, GetEventsResponse };
