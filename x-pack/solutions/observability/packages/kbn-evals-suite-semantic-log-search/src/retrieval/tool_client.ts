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

// Declared structurally rather than imported: the tools' result types are internal to the
// Observability Agent Builder plugin, and the eval should measure the response the tool actually
// sends rather than compile against its internals.
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
    // A broken run has to invalidate the experiment rather than compete in it: a zero-scoring
    // result is indistinguishable from a strategy that ranked badly.
    throw new Error(`${toolId} returned an error: ${message}`);
  }

  const data = (results[0]?.data ?? {}) as ToolData;
  const warnings = data.warnings ?? [];
  const totalCount = data.totalCount ?? 0;

  if (warnings.length > 0) {
    log.warning(`${toolId} warnings: ${warnings.join('; ')}`);
  }

  const parsedPatterns = toPatterns(data);

  // Matching documents with nothing parsed out of them means the response shape moved, which
  // would otherwise read as a strategy that found nothing. Runs before the cap, on the raw parse.
  if (parsedPatterns.length === 0 && totalCount > 0) {
    throw new Error(
      `${toolId} reported ${totalCount} matching documents but returned no parseable patterns: ` +
        `the tool response format may have changed (looked for data.patterns / data.categories).`
    );
  }

  // Both arms have to answer with the same candidate budget, or Recall rewards surface area
  // instead of ranking. The semantic arm is already capped server-side at `corpus.maxPatterns`,
  // while `get_logs` returns up to 60 categories from two `categorize_text` aggs of 30.
  // https://github.com/elastic/kibana/blob/59ab5b5b39f0/x-pack/solutions/observability/plugins/observability_agent_builder/server/tools/get_logs/handler.ts#L130
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

/** Runs `observability.get_logs` through the tool execution API (keyword arm). */
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
 * Runs `observability.get_logs_semantic` through the tool execution API (semantic arm).
 * Bypasses the agent's tool selection on purpose: this arm measures ranking, so the tool call
 * has to be fixed rather than chosen by a model.
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
