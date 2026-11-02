/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setTimeout } from 'timers/promises';
import type { HttpHandler } from '@kbn/core/public';
import { ConversationRoundStatus } from '@kbn/agent-builder-common';
import type { ConversationRound } from '@kbn/agent-builder-common';
import type { EvalConnector } from '@kbn/evals';
import { MAX_TEXT_LENGTH } from '@kbn/significant-events-schema';
import type { StartInvestigationResponse } from '@kbn/nightshift-investigations-plugin/common';
import type { Investigation } from '@kbn/agentic-investigations-plugin/common';
import { extractAccessedDecisionTrees } from './decision_tree_evidence';
import { extractToolCallTrajectory } from './tool_call_trajectory';
import { countToolCalls, extractUsage } from './usage';
import type {
  InvestigationExample,
  InvestigationReport,
  InvestigationTaskOutput,
  TrajectoryStep,
} from './types';

/** Matches the investigation workflow's `investigate` step timeout. */
export const INVESTIGATION_TIMEOUT_MS = 30 * 60_000;
/** The execution error of a run that ended without a `verdict`; judges still grade its hypotheses. */
export const NO_CONCLUSION_ERROR = 'Investigation finished without recording a conclusion';
export const UNPERSISTED_CONVERSATION_ERROR =
  'Investigation conversation still had an unfinished round after polling';
const MAX_PERSISTED_REPORT_BYTES = 512 * 1024;
const POLL_INTERVAL_MS = 1000;
/** How many polls a finished investigation's conversation gets to persist its rounds. */
const CONVERSATION_PERSIST_ATTEMPTS = 60;

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
  const { status, response, body } = (error ?? {}) as {
    status?: number;
    response?: { status?: number };
    body?: { statusCode?: number };
  };
  return status === 404 || response?.status === 404 || body?.statusCode === 404;
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

const readConversation = async (
  fetch: HttpHandler,
  id: string
): Promise<{ rounds: ConversationRound[] } | undefined> => {
  try {
    return await fetch<{ rounds: ConversationRound[] }>(
      `/api/agent_builder/conversations/${encodeURIComponent(id)}`,
      { headers: { 'elastic-api-version': '2023-10-31' } }
    );
  } catch (error) {
    if (isNotFound(error)) return undefined;
    throw error;
  }
};

const isPersisted = (conversation: { rounds: ConversationRound[] } | undefined): boolean =>
  Boolean(
    conversation &&
      conversation.rounds.length > 0 &&
      conversation.rounds.every(({ status }) => status !== ConversationRoundStatus.inProgress)
  );

/**
 * Reads the investigation's conversation. A finished investigation can report done before Agent
 * Builder persists its last round, so it waits for every round to be persisted and finished.
 */
const readFinishedConversation = async (
  fetch: HttpHandler,
  id: string,
  waitForRounds: boolean
): Promise<{ rounds: ConversationRound[] }> => {
  let conversation = await readConversation(fetch, id);
  for (
    let attempt = 1;
    waitForRounds && !isPersisted(conversation) && attempt < CONVERSATION_PERSIST_ATTEMPTS;
    attempt++
  ) {
    await setTimeout(POLL_INTERVAL_MS);
    conversation = await readConversation(fetch, id);
  }
  if (!conversation || conversation.rounds.length === 0) {
    throw new Error('Investigation conversation has no persisted rounds');
  }
  return conversation;
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
          ...(example.input.telemetry_target
            ? { telemetry_target: example.input.telemetry_target }
            : {}),
        }),
      }
    );
    output.investigation_id = investigationId;
    output.conversation_id = investigationId;
    investigation = await readInvestigation(fetch, investigationId);
    while (!investigation || investigation.in_progress) {
      output.workflow_status = 'running';
      if (Date.now() - started > INVESTIGATION_TIMEOUT_MS) {
        const minutes = INVESTIGATION_TIMEOUT_MS / 60_000;
        throw new Error(
          investigation
            ? `Investigation was still in progress after ${minutes} minutes`
            : `Investigation was not created within ${minutes} minutes`
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
      output.execution_error ??= NO_CONCLUSION_ERROR;
    }
    const conversation = await readFinishedConversation(
      fetch,
      investigation.id,
      !investigation.in_progress
    );
    if (!investigation.in_progress && !isPersisted(conversation)) {
      output.execution_error = UNPERSISTED_CONVERSATION_ERROR;
    }
    output.conversation_round_count = conversation.rounds.length;
    output.usage = extractUsage(conversation.rounds);
    output.tool_call_count = countToolCalls(conversation.rounds);
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
