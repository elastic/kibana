/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as z from 'zod';
import { filterStateStore } from '..';

export const alertsFilterQueryZodSchema = z.object({
  kql: z.string(),
  filters: z.array(
    z.object({
      query: z.optional(z.record(z.any())),
      meta: z.record(z.any()),
      $state: z.optional(
        z.object({
          store: z.union([
            z.literal(filterStateStore.APP_STATE),
            z.literal(filterStateStore.GLOBAL_STATE),
          ]),
        })
      ),
    })
  ),
  dsl: z.optional(z.string()),
});
