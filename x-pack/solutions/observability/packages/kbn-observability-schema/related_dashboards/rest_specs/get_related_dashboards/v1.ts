/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { relatedDashboardSchema } from '../../schema/related_dashboard/v1';

export const getRelatedDashboardsParamsSchema = z.object({
  query: z.object({
    alertId: z.string(),
  }),
});

export const getRelatedDashboardsResponseSchema = z.object({
  suggestedDashboards: z.array(relatedDashboardSchema),
  linkedDashboards: z.array(relatedDashboardSchema),
});

export type GetRelatedDashboardsResponse = z.output<typeof getRelatedDashboardsResponseSchema>;
