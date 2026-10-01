/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { MAX_TEXT_LENGTH } from '@kbn/significant-events-schema';
import type {
  Hypothesis,
  InvestigationImpactResponse,
  InvestigationProposalSummary,
  InvestigationSeverity,
} from '@kbn/agentic-investigations-plugin/common';

export const investigationExampleSchema = z.object({
  input: z.object({ question: z.string().trim().min(1).max(MAX_TEXT_LENGTH) }).catchall(z.json()),
  output: z.record(z.string(), z.json()).optional(),
  metadata: z.object({ case_id: z.string().trim().min(1).max(500) }).catchall(z.json()),
});

export type InvestigationExample = z.infer<typeof investigationExampleSchema>;

/**
 * One decision tree (symptom playbook) the investigation successfully read, and its content
 * (every successful read of it, concatenated in order; a failed read is not accessed at all).
 */
export interface AccessedDecisionTree {
  tree_id: string;
  content: string;
}

/** One tool call the investigation made, with a bounded rendering of its result(s). */
export interface TrajectoryStep {
  tool_id: string;
  params: Record<string, unknown>;
  result: string;
}

/**
 * What the investigation recorded, read from the shared investigations API
 * (`GET /internal/investigations/investigations/{id}`): the agent's summary ("what happened") and
 * verdict (the conclusion) from the conversation metadata, plus its hypotheses, impact, and
 * proposed actions.
 */
export interface InvestigationReport {
  summary?: string;
  conclusion?: string;
  severity?: InvestigationSeverity;
  hypotheses?: Hypothesis[];
  impact?: InvestigationImpactResponse;
  proposals?: Array<Pick<InvestigationProposalSummary, 'title' | 'comment' | 'status'>>;
}

/** `running` while an agent or driver workflow works on the investigation, `complete` after. */
export type InvestigationRunState = 'running' | 'complete';

export interface InvestigationTaskOutput {
  case_id: string;
  query: string;
  investigation_id?: string;
  conversation_id?: string;
  workflow_status?: InvestigationRunState;
  structured_report?: InvestigationReport;
  report_truncated?: boolean;
  conversation_round_count?: number;
  traceId?: string;
  execution_error?: string;
  decision_trees_accessed?: AccessedDecisionTree[];
  tool_call_trajectory?: TrajectoryStep[];
}
