/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { MAX_TEXT_LENGTH } from '@kbn/significant-events-schema';
import type {
  InvestigationStructuredOutput,
  InvestigationStatus,
} from '@kbn/nightshift-investigations-plugin/common';

export const investigationExampleSchema = z.object({
  input: z.object({ question: z.string().trim().min(1).max(MAX_TEXT_LENGTH) }).catchall(z.json()),
  output: z.record(z.string(), z.json()).optional(),
  metadata: z.object({ case_id: z.string().trim().min(1).max(500) }).catchall(z.json()),
});

export type InvestigationExample = z.infer<typeof investigationExampleSchema>;

export interface InvestigationTaskOutput {
  case_id: string;
  query: string;
  investigation_id?: string;
  conversation_id?: string;
  workflow_status?: InvestigationStatus;
  structured_report?: InvestigationStructuredOutput;
  report_truncated?: boolean;
  conversation_round_count?: number;
  traceId?: string;
  execution_error?: string;
}
