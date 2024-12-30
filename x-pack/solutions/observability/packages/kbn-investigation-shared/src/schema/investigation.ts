/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { alertOriginSchema, blankOriginSchema } from './origin';
import { investigationNoteSchema } from './investigation_note';
import { investigationItemSchema } from './investigation_item';

const statusSchema = z.union([
  z.literal('triage'),
  z.literal('active'),
  z.literal('mitigated'),
  z.literal('resolved'),
  z.literal('cancelled'),
]);

const investigationSchema = z.object({
  id: z.string(),
  title: z.string(),
  createdAt: z.number(),
  createdBy: z.string(),
  updatedAt: z.number(),
  params: z.object({
    timeRange: z.object({ from: z.number(), to: z.number() }),
  }),
  origin: z.union([alertOriginSchema, blankOriginSchema]),
  status: statusSchema,
  tags: z.array(z.string()),
  notes: z.array(investigationNoteSchema),
  items: z.array(investigationItemSchema),
  externalIncidentUrl: z.string().nullable(),
  rootCauseAnalysis: z
    .object({
      events: z.array(z.any()),
    })
    .optional(),
});

type Status = z.infer<typeof statusSchema>;

export type { Status };
export { investigationSchema, statusSchema };
