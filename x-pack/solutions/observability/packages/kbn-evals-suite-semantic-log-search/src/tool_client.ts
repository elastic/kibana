/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import type { ToolingLog } from '@kbn/tooling-log';
import { GET_LOGS_SEMANTIC_TOOL_ID, GET_LOGS_TOOL_ID } from './constants';
import type { CorpusProfile } from './corpora';
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

  const results = response.results ?? [];
  const errorResult = results.find((result) => result.type === 'error');

  if (errorResult) {
    const message = (errorResult.data as { message?: string } | undefined)?.message ?? 'unknown';
    log.error(`${toolId} returned an error: ${message}`);
    return { patterns: [], totalCount: 0, warnings: [], error: message };
  }

  const data = (results[0]?.data ?? {}) as ToolData;
  const warnings = data.warnings ?? [];

  if (warnings.length > 0) {
    log.warning(`${toolId} warnings: ${warnings.join('; ')}`);
  }

  return {
    patterns: toPatterns(data),
    totalCount: data.totalCount ?? 0,
    warnings,
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
