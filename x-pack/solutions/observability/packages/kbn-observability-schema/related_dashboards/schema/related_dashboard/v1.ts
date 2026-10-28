/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';

const commonDashboardSchema = {
  id: lazySchema(() => z.string()),
  title: lazySchema(() => z.string()),
  description: lazySchema(() => z.string().optional()),
  tags: lazySchema(() => z.array(z.string()).optional()),
};

export const linkedDashboardSchema = lazySchema(() =>
  z.object({
    ...commonDashboardSchema,
    matchedBy: z.object({
      fields: z.array(z.string()).optional(),
      index: z.array(z.string()).optional(),
      linked: z.boolean().optional(),
    }),
  })
);

export const suggestedDashboardSchema = lazySchema(() =>
  z.object({
    ...commonDashboardSchema,
    matchedBy: z.object({
      fields: z.array(z.string()).optional(),
      index: z.array(z.string()).optional(),
    }),
    score: z.number(),
  })
);

export type LinkedDashboard = z.output<typeof linkedDashboardSchema>;
export type SuggestedDashboard = z.output<typeof suggestedDashboardSchema>;
export type RelatedDashboard = LinkedDashboard | SuggestedDashboard;
