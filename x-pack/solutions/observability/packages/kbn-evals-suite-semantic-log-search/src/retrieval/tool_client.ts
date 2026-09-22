/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import type { ToolingLog } from '@kbn/tooling-log';
import { GET_LOGS_SEMANTIC_TOOL_ID, GET_LOGS_TOOL_ID } from '../constants';
import type { CorpusProfile } from '../corpora';
import type { RetrievalTaskOutput, RetrievedPattern } from './types';

/**
 * The slice of tool output this suite reads. Declared structurally rather
 * than imported, because the tools' result types are internal to the
 * Observability Agent Builder plugin and the eval should not be coupled to
 * their internals.
 */
interface PatternLike {
  pattern?: string;
  count?: number;
  sample?: { message?: string; [key: string]: unknown };
  relevanceScore?: number;
}

interface ToolData {
  categories?: PatternLike[];
  patterns?: PatternLike[];
  totalCount?: number;
  warnings?: string[];
}

interface ToolExecuteResponse {
  results?: Array<{ type?: string; data?: unknown }>;
}

interface BaseRetrievalParams {
  fetch: HttpHandler;
  log: ToolingLog;
  connectorId: string;
  corpus: CorpusProfile;
  kqlFilter?: string;
}

export interface KeywordRetrievalParams extends BaseRetrievalParams {
  kqlFilter?: string;
}

export interface SemanticRetrievalParams extends BaseRetrievalParams {
  /** The natural-language query forwarded to the semantic retrieval tool. */
  semanticFilter: string;
}

const toRetrievedPatterns = (items: PatternLike[]): RetrievedPattern[] =>
  items.map((item) => ({
    pattern: item.pattern ?? '',
    message: item.sample?.message ?? item.pattern ?? '',
    count: item.count ?? 0,
    ...(item.relevanceScore !== undefined ? { relevanceScore: item.relevanceScore } : {}),
  }));

const executeTool = async ({
  fetch,
  log,
  connectorId,
  corpus,
  toolId,
  toolParams,
  toPatterns,
}: {
  fetch: HttpHandler;
  log: ToolingLog;
  connectorId: string;
  corpus: CorpusProfile;
  toolId: string;
  toolParams: Record<string, unknown>;
  toPatterns: (data: ToolData) => RetrievedPattern[];
}): Promise<RetrievalTaskOutput> => {
  const fetchStart = Date.now();
  const response = await fetch<ToolExecuteResponse>('/api/agent_builder/tools/_execute', {
    method: 'POST',
    version: '2023-10-31',
    body: JSON.stringify({
      tool_id: toolId,
      connector_id: connectorId,
      tool_params: {
        start: corpus.timeRange.start,
        end: corpus.timeRange.end,
        index: corpus.target,
        ...toolParams,
      },
    }),
  });
  const latencyMs = Date.now() - fetchStart;

  const results = response.results ?? [];
  const errorResult = results.find((result) => result.type === 'error');

  if (errorResult) {
    const message = (errorResult.data as { message?: string } | undefined)?.message ?? 'unknown';
    // Throw rather than returning a zero-scoring result. A broken run must
    // invalidate the experiment, not silently compete with valid runs.
    throw new Error(`${toolId} returned an error: ${message}`);
  }

  const data = (results[0]?.data ?? {}) as ToolData;
  const warnings = data.warnings ?? [];
  const totalCount = data.totalCount ?? 0;

  if (warnings.length > 0) {
    log.warning(`${toolId} warnings: ${warnings.join('; ')}`);
  }

  const parsedPatterns = toPatterns(data);

  // Guard against field-name drift: if the tool reported matching documents but
  // we parsed zero patterns, the response format has likely changed.
  // Run before the cap so the guard still sees the raw parse.
  if (parsedPatterns.length === 0 && totalCount > 0) {
    throw new Error(
      `${toolId} reported ${totalCount} matching documents but returned no parseable patterns ` +
        `— the tool response format may have changed (looked for data.patterns / data.categories).`
    );
  }

  // Apply a uniform cap across both arms. The semantic arm is server-side capped
  // at corpus.maxPatterns; the keyword arm has no server-side limit (get_logs
  // returns up to 60 categories across two aggs). Capping here enforces the same
  // candidate budget so Recall cannot be inflated by giving one arm more surface area.
  const returnedBeforeCap = parsedPatterns.length;
  const patterns = parsedPatterns.slice(0, corpus.maxPatterns);

  return {
    patterns,
    totalCount,
    warnings,
    latencyMs,
    returnedBeforeCap,
  };
};

/**
 * Runs `observability.get_logs` through the tool execution API (keyword arm).
 */
export const executeGetLogs = async ({
  fetch,
  log,
  connectorId,
  corpus,
  kqlFilter,
}: KeywordRetrievalParams): Promise<RetrievalTaskOutput> =>
  executeTool({
    fetch,
    log,
    connectorId,
    corpus,
    toolId: GET_LOGS_TOOL_ID,
    toolParams: {
      ...(kqlFilter ? { kqlFilter } : {}),
    },
    toPatterns: (data) => toRetrievedPatterns(data.categories ?? []),
  });

/**
 * Runs `observability.get_logs_semantic` through the tool execution API
 * (semantic arm). Bypasses the agent's tool selection on purpose: the retrieval
 * arm measures ranking quality, so the tool call has to be deterministic.
 */
export const executeGetLogsSemantic = async ({
  fetch,
  log,
  connectorId,
  corpus,
  semanticFilter,
  kqlFilter,
}: SemanticRetrievalParams): Promise<RetrievalTaskOutput> =>
  executeTool({
    fetch,
    log,
    connectorId,
    corpus,
    toolId: GET_LOGS_SEMANTIC_TOOL_ID,
    toolParams: {
      semanticFilter,
      maxPatterns: corpus.maxPatterns,
      ...(kqlFilter ? { kqlFilter } : {}),
    },
    toPatterns: (data) => toRetrievedPatterns(data.patterns ?? []),
  });
