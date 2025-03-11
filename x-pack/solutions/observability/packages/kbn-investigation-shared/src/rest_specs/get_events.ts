/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { eventTypeSchema, eventSchema } from '../schema';

const getEventsParamsSchema = z
  .object({
    query: z
      .object({
        rangeFrom: z.string(),
        rangeTo: z.string(),
        filter: z.string(),
        eventTypes: z.string().transform((val, ctx) => {
          const eventTypes = val.split(',');
          const hasInvalidType = eventTypes.some((eventType) => !eventTypeSchema.parse(eventType));
          if (hasInvalidType) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'Invalid event type',
            });
            return z.NEVER;
          }
          return val.split(',').map((v) => eventTypeSchema.parse(v));
        }),
      })
      .partial(),
  })
  .partial();

const getEventsResponseSchema = z.array(eventSchema);

type GetEventsParams = z.infer<typeof getEventsParamsSchema.shape.query>;
type GetEventsResponse = z.output<typeof getEventsResponseSchema>;

export { getEventsParamsSchema, getEventsResponseSchema };
export type { GetEventsParams, GetEventsResponse };
