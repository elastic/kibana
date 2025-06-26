/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

export const relevantPanelSchema = z.object({
  panel: z.object({
    panelIndex: z.string(),
    type: z.string(),
    panelConfig: z.record(z.string(), z.any()),
    title: z.string().optional(),
  }),
  matchedBy: z.object({
    fields: z.array(z.string()).optional(),
    index: z.array(z.string()).optional(),
  }),
});

export type RelevantPanel = z.output<typeof relevantPanelSchema>;
