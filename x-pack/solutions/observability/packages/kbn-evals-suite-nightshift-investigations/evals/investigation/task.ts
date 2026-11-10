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
import { extractFinalResponse, extractToolCallTrajectory } from './tool_call_trajectory';
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

const httpStatus = (error: unknown): number | undefined => {
  const { status, response, body } = (error ?? {}) as {
    status?: number;
    response?: { status?: number };
    body?: { statusCode?: number };
  };
  return status ?? response?.status ?? body?.statusCode;
};

const isNotFound = (error: unknown): boolean => httpStatus(error) === 404;

/**
 * A shard that is still starting, or a brief upstream failure, comes back as 500–504. The
 * investigation keeps running, so a poll treats that like "not yet" and tries again.
 */
const TRANSIENT_READ_STATUSES = new Set([500, 502, 503, 504]);
const isTransientReadError = (error: unknown): boolean => {
  const status = httpStatus(error);
  return status !== undefined && TRANSIENT_READ_STATUSES.has(status);
};

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

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

/**
 * Why the last round stopped, when the agent failed or was aborted. Agent Builder keeps such a
 * round as `completed`, so without this a crash would read as an investigation that concluded nothing.
 */
const roundInterruptionError = (rounds: ConversationRound[]): string | undefined => {
  const interruption = rounds.at(-1)?.interruption;
  if (!interruption) return undefined;
  if (interruption.type === 'failed') {
    return `Investigation round failed: ${interruption.error.message}`;
  }
  const source = interruption.aborted_by?.source;
  return `Investigation round was aborted${source ? ` by ${source}` : ''}`;
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
  let lastTransient: unknown;
  const read = async () => {
    try {
      const conversation = await readConversation(fetch, id);
      lastTransient = undefined;
      return conversation;
    } catch (error) {
      if (!isTransientReadError(error)) throw error;
      lastTransient = error;
      return undefined;
    }
  };
  let conversation = await read();
  for (
    let attempt = 1;
    waitForRounds && !isPersisted(conversation) && attempt < CONVERSATION_PERSIST_ATTEMPTS;
    attempt++
  ) {
    await setTimeout(POLL_INTERVAL_MS);
    conversation = await read();
  }
  if (!conversation || conversation.rounds.length === 0) {
    if (lastTransient && !conversation) throw lastTransient;
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

/**
 * Waits up to `timeoutMs` for an investigation, its last round included, to end, and says whether
 * it did. One not found yet may still be created by its workflow, so it does not count as ended.
 */
export const waitForInvestigationToEnd = async (
  fetch: HttpHandler,
  id: string,
  timeoutMs: number
): Promise<boolean> => {
  const started = Date.now();
  for (;;) {
    const investigation = await readInvestigation(fetch, id);
    if (
      investigation &&
      !investigation.in_progress &&
      isPersisted(await readConversation(fetch, id))
    ) {
      return true;
    }
    if (Date.now() - started >= timeoutMs) return false;
    await setTimeout(POLL_INTERVAL_MS);
  }
};

/** Runs a manual investigation and retains a bounded report with references to its full evidence. */
export const runInvestigation = async (
  fetch: HttpHandler,
  example: InvestigationExample,
  connector: Pick<EvalConnector, 'id'>,
  { timeoutMs = INVESTIGATION_TIMEOUT_MS }: { timeoutMs?: number } = {}
): Promise<InvestigationTaskOutput> => {
  const started = Date.now();
  const output: InvestigationTaskOutput = {
    case_id: example.metadata.case_id,
    query: example.input.question,
  };
  let investigation: Investigation | undefined;
  let conversation: { rounds: ConversationRound[] } | undefined;
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
    let lastTransient: unknown;
    const readSnapshot = async () => {
      try {
        const snapshot = await readInvestigation(fetch, investigationId);
        lastTransient = undefined;
        return snapshot;
      } catch (error) {
        if (!isTransientReadError(error)) throw error;
        lastTransient = error;
        return undefined;
      }
    };
    const readRound = async (id: string) => {
      try {
        const snapshot = await readConversation(fetch, id);
        lastTransient = undefined;
        return snapshot;
      } catch (error) {
        if (!isTransientReadError(error)) throw error;
        lastTransient = error;
        return undefined;
      }
    };
    investigation = await readSnapshot();
    // A pending proposal ends `in_progress` while the agent's round is still running, so the run is
    // only over once that round has finished too. A transient conversation read is retried on its
    // own; an unfinished round goes back to the investigation, whose verdict may have landed.
    while (!investigation || investigation.in_progress || !isPersisted(conversation)) {
      output.workflow_status = 'running';
      if (Date.now() - started > timeoutMs) {
        const minutes = timeoutMs / 60_000;
        const waited = investigation
          ? `Investigation was still in progress after ${minutes} minutes`
          : `Investigation was not created within ${minutes} minutes`;
        throw new Error(
          lastTransient ? `${waited}. Last read failed: ${errorMessage(lastTransient)}` : waited
        );
      }
      await setTimeout(POLL_INTERVAL_MS);
      if (!investigation || investigation.in_progress) {
        investigation = (await readSnapshot()) ?? investigation;
        continue;
      }
      conversation = await readRound(investigation.id);
      if (!conversation && lastTransient) {
        continue;
      }
      if (!isPersisted(conversation)) {
        investigation = (await readSnapshot()) ?? investigation;
      }
    }
    // The verdict may have been written after the last read, while the round was finishing. A
    // transient failure here keeps the snapshot already read.
    investigation = (await readSnapshot()) ?? investigation;
  } catch (error) {
    output.execution_error = errorMessage(error);
  }
  if (!investigation || !output.investigation_id) return boundOutput(output);

  // A timeout or failed poll must not discard the conversation accumulated before the failure.
  try {
    output.workflow_status = investigation.in_progress ? 'running' : 'complete';
    output.structured_report = toInvestigationReport(investigation);
    if (!isPersisted(conversation)) {
      conversation = await readFinishedConversation(
        fetch,
        investigation.id,
        !investigation.in_progress
      );
    }
    if (!conversation) throw new Error('Investigation conversation has no persisted rounds');
    if (!investigation.in_progress && !isPersisted(conversation)) {
      output.execution_error = UNPERSISTED_CONVERSATION_ERROR;
    }
    const reply = extractFinalResponse(conversation.rounds);
    if (reply && !output.structured_report.conclusion) {
      // The agent answers in its final message instead of recording a verdict on the investigation.
      output.structured_report = {
        ...output.structured_report,
        summary: output.structured_report.summary ?? reply,
        conclusion: reply,
      };
    }
    if (!investigation.in_progress) {
      // The investigation has no failed state, so its last round says whether the agent crashed,
      // even after recording a verdict, or simply recorded no conclusion.
      const interruption = roundInterruptionError(conversation.rounds);
      if (interruption) {
        output.execution_error ??= interruption;
      } else if (!output.structured_report.conclusion) {
        output.execution_error ??= NO_CONCLUSION_ERROR;
      }
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
