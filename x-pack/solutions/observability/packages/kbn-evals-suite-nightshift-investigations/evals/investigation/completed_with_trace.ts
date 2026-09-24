/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setTimeout } from 'timers/promises';
import type { HttpHandler } from '@kbn/core/public';
import type { EsClient } from '@kbn/scout';
import type { EvaluationResult, Evaluator } from '@kbn/evals';
import { isToolCallStep } from '@kbn/agent-builder-common';
import type { ConversationRound } from '@kbn/agent-builder-common';
import type { GenAISemConvAttributes } from '@kbn/inference-tracing';
import { INVESTIGATION_TIMEOUT_ERROR, fetchConversation, roundTraceIds } from './task';
import { assertAgentTrace } from './trace_evidence';
import type { InvestigationExample, InvestigationTaskOutput } from './types';

/** Closed set of reasons; each score names the first failing one. */
export const COMPLETION_LABELS = [
  'completed',
  'timeout',
  'workflow_failed',
  'schema_rejected',
  'no_report',
  'no_trace',
  'trace_incomplete',
] as const;
export type CompletionLabel = (typeof COMPLETION_LABELS)[number];

const TRACE_ID = /^[a-f0-9]{32}$/;
// The workflow persists the report through Kibana routes whose schemas reject unexpected fields.
const SCHEMA_REJECTION = /\bHTTP 400\b|did not match expected schema/;
const MAX_EXPLANATION_LENGTH = 1_000;
const DEFAULT_POLL = { timeoutMs: 60_000, intervalMs: 2_000 };

export interface CompletedWithTraceDependencies {
  fetch: HttpHandler;
  traceEsClient: EsClient;
  /** The investigator's system prompt; its presence in the exported trace is part of linkage. */
  systemInstructions: string;
  /** Span arrival budget; defaults to polling for one minute. */
  poll?: { timeoutMs: number; intervalMs: number };
}

interface TraceLinkage {
  fetch: HttpHandler;
  traceEsClient: EsClient;
  systemInstructions: string;
  poll: { timeoutMs: number; intervalMs: number };
}

const failure = (
  label: Exclude<CompletionLabel, 'completed'>,
  explanation: string,
  metadata?: Record<string, unknown>
): EvaluationResult => ({
  score: 0,
  label,
  explanation: explanation.slice(0, MAX_EXPLANATION_LENGTH),
  metadata,
});

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

// Everything the persisted output alone can decide; returns nothing when the trace must be read.
const classifyOutput = ({
  execution_error: executionError,
  workflow_status: status,
  structured_report: report,
  conversation_id: conversationId,
  traceId,
}: InvestigationTaskOutput): EvaluationResult | undefined => {
  if (executionError === INVESTIGATION_TIMEOUT_ERROR) {
    return failure('timeout', executionError);
  }
  if (status !== 'completed') {
    const explanation = executionError ?? `Investigation ${status ?? 'did not start'}`;
    const rejected = status === 'failed' && SCHEMA_REJECTION.test(explanation);
    return failure(rejected ? 'schema_rejected' : 'workflow_failed', explanation);
  }
  if (!(report?.conclusion || report?.summary)) {
    return failure('no_report', 'Completed investigation has no conclusion or summary');
  }
  if (!conversationId) {
    return failure('no_trace', executionError ?? 'Completed investigation has no conversation id');
  }
  if (!traceId || !TRACE_ID.test(traceId)) {
    return failure(
      'no_trace',
      executionError ?? `Completed investigation has no well-formed trace id: ${traceId}`
    );
  }
  if (executionError) {
    return failure('workflow_failed', executionError);
  }
};

// Spans are exported asynchronously, so keep looking until the budget runs out.
const awaitLinkedTrace = async (
  { query, conversationId }: { query: string; conversationId: string },
  rounds: ConversationRound[],
  { traceEsClient, systemInstructions, poll }: TraceLinkage
): Promise<EvaluationResult> => {
  const agentTraceIds = roundTraceIds(rounds);
  if (agentTraceIds.length === 0) {
    return failure('no_trace', 'Saved conversation has no trace ids');
  }
  const toolCalls = rounds.flatMap(({ steps }) => steps.filter(isToolCallStep)).length;
  const deadline = Date.now() + poll.timeoutMs;
  let spans = 0;
  let lastFailure: string | undefined;
  for (;;) {
    try {
      const response = await traceEsClient.search<{ attributes: GenAISemConvAttributes }>({
        index: 'traces-*',
        size: 1_000,
        query: { terms: { 'trace.id': agentTraceIds } },
        _source: ['attributes'],
      });
      const attributes = response.hits.hits.flatMap(({ _source: source }) =>
        source ? [source.attributes] : []
      );
      spans = attributes.length;
      if (spans > 0) {
        assertAgentTrace(attributes, {
          question: query,
          conversationId,
          systemInstructions,
          rounds,
        });
        return {
          score: 1,
          label: 'completed',
          explanation: `Completed with a report and a linked agent trace (${spans} spans, ${toolCalls} tool calls)`,
          metadata: { spans, tool_calls: toolCalls },
        };
      }
    } catch (error) {
      lastFailure = errorMessage(error);
    }
    if (Date.now() >= deadline) break;
    await setTimeout(poll.intervalMs);
  }
  if (spans === 0) {
    const detail = lastFailure ? `: ${lastFailure}` : '';
    return failure('no_trace', `No agent spans arrived within ${poll.timeoutMs} ms${detail}`, {
      spans,
    });
  }
  return failure('trace_incomplete', lastFailure ?? 'Agent trace is incomplete', {
    spans,
    tool_calls: toolCalls,
  });
};

/** Scores 1 when the investigation completed with a report and a linked agent trace, else 0 with the first failing reason as label. */
export const createCompletedWithTraceEvaluator = ({
  fetch,
  traceEsClient,
  systemInstructions,
  poll = DEFAULT_POLL,
}: CompletedWithTraceDependencies): Evaluator<InvestigationExample, InvestigationTaskOutput> => ({
  name: 'completed_with_trace',
  kind: 'CODE',
  direction: 'maximize',
  // Makes Elasticsearch queries only; it never calls a model and does not judge the answer.
  evaluate: async ({ output }) => {
    const decided = classifyOutput(output);
    if (decided) return decided;
    const { query, conversation_id: conversationId = '' } = output;
    let rounds: ConversationRound[];
    try {
      ({ rounds } = await fetchConversation(fetch, conversationId));
    } catch (error) {
      return failure('no_trace', `Saved conversation could not be read: ${errorMessage(error)}`);
    }
    return awaitLinkedTrace({ query, conversationId }, rounds, {
      fetch,
      traceEsClient,
      systemInstructions,
      poll,
    });
  },
});
