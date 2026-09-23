/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import type { ToolingLog } from '@kbn/tooling-log';
import { GET_LOGS_SEMANTIC_TOOL_ID, GET_LOGS_TOOL_ID, GET_LOG_GROUPS_TOOL_ID } from '../constants';
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

/**
 * A `get_log_groups` entry. Structurally unlike the other two tools' results: no `pattern` at all
 * on `spanException` groups, where the grouping key lives inside `sample` instead.
 */
interface GroupLike {
  type?: string;
  pattern?: string;
  count?: number;
  sample?: Record<string, unknown>;
}

// Each tool names its result array differently, so the payload key is itself part of the contract
// the eval depends on: `categories` for get_logs, `patterns` for get_logs_semantic, `groups` for
// get_log_groups. Only the first two carry `totalCount`.
interface ToolData {
  categories?: PatternLike[];
  patterns?: PatternLike[];
  groups?: GroupLike[];
  totalCount?: number;
  warnings?: string[];
}

/** `get_log_groups` entries that are not log groups: APM span exceptions, grouped by id, not text. */
const NON_LOG_GROUP_TYPE = 'spanException';

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

const isLogGroup = (group: GroupLike): boolean => group.type !== NON_LOG_GROUP_TYPE;

/**
 * Maps `get_log_groups` output, dropping APM span exceptions.
 *
 * Throws when `groups` is absent, because this tool reports no `totalCount` and so cannot trip the
 * field-drift guard in `executeTool`: a renamed key would otherwise read as "the corpus had
 * nothing", which is the failure mode that guard exists to prevent.
 *
 * The exception variants categorize `error.exception.message` rather than `message`, so the text
 * the ground truth matches against has to be resolved per type.
 */
const toGroupPatterns = (data: ToolData): RetrievedPattern[] => {
  const { groups } = data;
  if (groups === undefined) {
    throw new Error(
      `${GET_LOG_GROUPS_TOOL_ID} returned no "groups" key; the tool response format may have changed`
    );
  }

  return groups.filter(isLogGroup).map((group) => {
    const sample = group.sample ?? {};
    const message = sample.message ?? sample['error.exception.message'] ?? group.pattern ?? '';
    return {
      pattern: group.pattern ?? '',
      message: String(message),
      count: group.count ?? 0,
    };
  });
};

const executeTool = async ({
  fetch,
  log,
  connectorId,
  corpus,
  toolId,
  toolParams,
  toPatterns,
  extraOutput,
}: {
  fetch: HttpHandler;
  log: ToolingLog;
  connectorId: string;
  corpus: CorpusProfile;
  toolId: string;
  toolParams: Record<string, unknown>;
  toPatterns: (data: ToolData) => RetrievedPattern[];
  /** Per-arm diagnostics to surface in evaluator metadata. Only the groups arm needs this. */
  extraOutput?: (data: ToolData) => Partial<RetrievalTaskOutput>;
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

  // Every arm has to answer with the same candidate budget, or Recall rewards surface area instead
  // of ranking. The semantic arm is already capped server-side at `corpus.maxPatterns`, while
  // `get_logs` returns up to 60 categories from two `categorize_text` aggs of 30.
  // https://github.com/elastic/kibana/blob/59ab5b5b39f0/x-pack/solutions/observability/plugins/observability_agent_builder/server/tools/get_logs/handler.ts#L130
  const returnedBeforeCap = parsedPatterns.length;
  const patterns = parsedPatterns.slice(0, corpus.maxPatterns);

  return {
    patterns,
    totalCount,
    warnings,
    latencyMs,
    returnedBeforeCap,
    ...(extraOutput ? extraOutput(data) : {}),
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

/**
 * Runs `observability.get_log_groups` through the tool execution API (groups arm).
 *
 * The caller passes the question as a `kqlFilter`, which is the only query input this tool has: it
 * accepts no semantic or free-text parameter. Using the same filter the keyword arm builds keeps
 * every arm on one input, so a difference between arms is attributable to the tool rather than to
 * what each was told.
 *
 * Reads counts as returned. They are exact only below the tool's sampling threshold of roughly
 * 20 000 matching documents; above it `random_sampler` counts are used raw and never divided back
 * by the probability, which breaks the `count` contract in `./types`.
 * https://github.com/elastic/kibana/blob/b539ca309483/x-pack/solutions/observability/plugins/observability_agent_builder/server/tools/get_log_groups/get_categorized_logs.ts#L104
 */
export const executeGetLogGroups = async ({
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
    toolId: GET_LOG_GROUPS_TOOL_ID,
    toolParams: {
      limit: corpus.maxPatterns,
      ...(kqlFilter ? { kqlFilter } : {}),
    },
    toPatterns: toGroupPatterns,
    extraOutput: (data) => ({
      droppedNonLogGroups: (data.groups ?? []).filter((group) => !isLogGroup(group)).length,
    }),
  });
