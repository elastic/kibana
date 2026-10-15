/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setTimeout } from 'timers/promises';
import type { HttpHandler } from '@kbn/core/public';
import type { ConversationRound } from '@kbn/agent-builder-common';
import type { EvalConnector } from '@kbn/evals';
import { MAX_TEXT_LENGTH } from '@kbn/significant-events-schema';
import type { StartInvestigationResponse } from '@kbn/nightshift-investigations-plugin/common';
import type { Investigation } from '@kbn/agentic-investigations-plugin/common';
import { extractAccessedDecisionTrees } from './decision_tree_evidence';
import { extractToolCallTrajectory } from './tool_call_trajectory';
import type {
  InvestigationExample,
  InvestigationReport,
  InvestigationTaskOutput,
  TrajectoryStep,
} from './types';

export const INVESTIGATION_TIMEOUT_MS = 20 * 60_000;
const MAX_PERSISTED_REPORT_BYTES = 512 * 1024;
const POLL_INTERVAL_MS = 1000;

/** The shared investigations API; the investigation id is its Agent Builder conversation id. */
const investigationPath = (id: string) =>
  `/internal/investigations/investigations/${encodeURIComponent(id)}`;
const INVESTIGATIONS_API_HEADERS = { 'elastic-api-version': '1' };

/** Keeps as many (already per-field-bounded) trajectory steps, in order, as fit the byte budget. */
const boundTrajectory = (trajectory: TrajectoryStep[]): TrajectoryStep[] => {
  const bounded: TrajectoryStep[] = [];
  let bytes = 0;
  for (const step of trajectory) {
    const size = Buffer.byteLength(JSON.stringify(step), 'utf8');
    if (bytes + size > MAX_PERSISTED_REPORT_BYTES) break;
    bounded.push(step);
    bytes += size;
  }
  return bounded;
};

const boundOutput = (output: InvestigationTaskOutput): InvestigationTaskOutput => {
  const { structured_report: report, execution_error: executionError } = output;
  if (report && Buffer.byteLength(JSON.stringify(report), 'utf8') > MAX_PERSISTED_REPORT_BYTES) {
    // Full evidence remains on the investigation and its agent traces, outside the score body.
    output.structured_report = {
      summary: report.summary?.slice(0, MAX_TEXT_LENGTH),
      conclusion: report.conclusion?.slice(0, MAX_TEXT_LENGTH),
      severity: report.severity,
    };
    output.report_truncated = true;
  }
  if (executionError && executionError.length > MAX_TEXT_LENGTH) {
    output.execution_error = `${executionError.slice(0, MAX_TEXT_LENGTH)} [truncated]`;
  }
  return output;
};

const isNotFound = (error: unknown): boolean => {
  const { response, body } = (error ?? {}) as {
    response?: { status?: number };
    body?: { statusCode?: number };
  };
  return response?.status === 404 || body?.statusCode === 404;
};

/**
 * Reads the investigation from the shared API. A start returns its id before the investigation's
 * run creates the conversation, so a 404 means "not yet" and reads as undefined.
 */
const readInvestigation = async (
  fetch: HttpHandler,
  id: string
): Promise<Investigation | undefined> => {
  try {
    return await fetch<Investigation>(investigationPath(id), {
      headers: INVESTIGATIONS_API_HEADERS,
    });
  } catch (error) {
    if (isNotFound(error)) return undefined;
    throw error;
  }
};

/** What the investigation recorded, in the shape the judges read. */
export const toInvestigationReport = ({
  metadata,
  hypotheses,
  impact,
  proposals,
}: Investigation): InvestigationReport => ({
  summary: metadata.summary,
  conclusion: metadata.verdict,
  severity: metadata.severity,
  hypotheses: hypotheses?.hypotheses,
  impact,
  proposals: proposals.map(({ title, comment, status }) => ({ title, comment, status })),
});

/** Runs a manual investigation and retains a bounded report with references to its full evidence. */
export const runInvestigation = async (
  fetch: HttpHandler,
  example: InvestigationExample,
  connector: Pick<EvalConnector, 'id'>
): Promise<InvestigationTaskOutput> => {
  const started = Date.now();
  const output: InvestigationTaskOutput = {
    case_id: example.metadata.case_id,
    query: example.input.question,
  };
  let investigation: Investigation | undefined;
  try {
    const { investigation_id: investigationId } = await fetch<StartInvestigationResponse>(
      '/internal/nightshift/investigations',
      {
        method: 'POST',
        body: JSON.stringify({
          subject: { type: 'manual' },
          message: example.input.question,
          connector_id: connector.id,
        }),
      }
    );
    output.investigation_id = investigationId;
    output.conversation_id = investigationId;
    investigation = await readInvestigation(fetch, investigationId);
    while (!investigation || investigation.in_progress) {
      output.workflow_status = 'running';
      if (Date.now() - started > INVESTIGATION_TIMEOUT_MS) {
        throw new Error(
          investigation
            ? 'Investigation was still in progress after 20 minutes'
            : 'Investigation was not created within 20 minutes'
        );
      }
      await setTimeout(POLL_INTERVAL_MS);
      investigation = (await readInvestigation(fetch, investigationId)) ?? investigation;
    }
  } catch (error) {
    output.execution_error = error instanceof Error ? error.message : String(error);
  }
  if (!investigation || !output.investigation_id) return boundOutput(output);

  // A timeout or failed poll must not discard the conversation accumulated before the failure.
  try {
    output.workflow_status = investigation.in_progress ? 'running' : 'complete';
    output.structured_report = toInvestigationReport(investigation);
    if (!investigation.in_progress && !investigation.metadata.verdict) {
      // There is no failed state: a run that ended without a conclusion recorded none.
      output.execution_error ??= 'Investigation finished without recording a conclusion';
    }
    const conversation = await fetch<{ rounds: ConversationRound[] }>(
      `/api/agent_builder/conversations/${encodeURIComponent(investigation.id)}`,
      { headers: { 'elastic-api-version': '2023-10-31' } }
    );
    output.conversation_round_count = conversation.rounds.length;
    output.traceId = conversation.rounds
      .flatMap(({ trace_id: traceId }) => (typeof traceId === 'string' ? [traceId] : traceId ?? []))
      .filter(Boolean)
      .at(-1);
    const accessedTrees = extractAccessedDecisionTrees(conversation.rounds);
    if (accessedTrees.length > 0) {
      output.decision_trees_accessed = accessedTrees.map(({ tree_id: treeId, content }) => ({
        tree_id: treeId,
        content: content.slice(0, MAX_TEXT_LENGTH),
      }));
    }
    const trajectory = extractToolCallTrajectory(conversation.rounds).map((step) => ({
      ...step,
      result: step.result.slice(0, MAX_TEXT_LENGTH),
    }));
    if (trajectory.length > 0) {
      output.tool_call_trajectory = boundTrajectory(trajectory);
    }
  } catch (error) {
    output.execution_error ??= error instanceof Error ? error.message : String(error);
  }
  return boundOutput(output);
};
