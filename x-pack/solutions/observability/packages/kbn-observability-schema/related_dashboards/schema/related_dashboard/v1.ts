/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { relevantPanelSchema } from '../relevant_panel/latest';

export const relatedDashboardSchema = z.object({
  id: z.string(),
  title: z.string(),
  matchedBy: z.object({
    fields: z.array(z.string()).optional(),
    index: z.array(z.string()).optional(),
  }),
  relevantPanelCount: z.number(),
  relevantPanels: z.array(relevantPanelSchema),
});

export type RelatedDashboard = z.output<typeof relatedDashboardSchema>;
