/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { validateTimezone } from './validate_timezone';
import { validateDurationSchema } from '../../lib';
import { validateHours } from './validate_hours';

export const actionsSchema = z.array(
  z.object({
    group: z.string(),
    id: z.string(),
    frequency: z.optional(
      z.object({
        summary: z.boolean(),
        notify_when: z.enum(['onActionGroupChange', 'onActiveAlert', 'onThrottleInterval']),
        throttle: z.nullable(z.string().superRefine(validateDurationSchema)),
      })
    ),
    params: z.record(z.string(), z.any()),
    uuid: z.optional(z.string()),
    alerts_filter: z.optional(
      z.object({
        query: z.optional(
          z.object({
            kql: z.string(),
            filters: z.array(
              z.object({
                query: z.optional(z.record(z.string(), z.any())),
                meta: z.record(z.string(), z.any()),
                state$: z.optional(z.object({ store: z.string() })),
              })
            ),
            dsl: z.optional(z.string()),
          })
        ),
        timeframe: z.optional(
          z.object({
            days: z.array(
              z.union([
                z.literal(1),
                z.literal(2),
                z.literal(3),
                z.literal(4),
                z.literal(5),
                z.literal(6),
                z.literal(7),
              ])
            ),
            hours: z.object({
              start: z.string().superRefine(validateHours),
              end: z.string().superRefine(validateHours),
            }),
            timezone: z.string().superRefine(validateTimezone),
          })
        ),
      })
    ),
  })
);
