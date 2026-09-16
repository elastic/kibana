/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import type { ToolingLog } from '@kbn/tooling-log';
import { GET_LOGS_TOOL_ID } from './constants';
import type { CorpusProfile } from './corpora';
import type { RetrievedPattern } from './metrics';

/**
 * The slice of `get_logs` output this suite reads. Declared structurally rather
 * than imported, because the tool's result type is internal to the Observability
 * Agent Builder plugin and the eval should not be coupled to its internals.
 */
interface GetLogsCategory {
  pattern?: string;
  count?: number;
  sample?: { message?: string; [key: string]: unknown };
}

interface GetLogsData {
  categories?: GetLogsCategory[];
  totalCount?: number;
  warnings?: string[];
}

interface ToolExecuteResponse {
  results?: Array<{ type?: string; data?: unknown }>;
}

export interface GetLogsRun {
  patterns: RetrievedPattern[];
  totalCount: number;
  /** Populated when the service could not run semantically and the tool fell back. */
  warnings: string[];
  error?: string;
}

export interface ExecuteGetLogsParams {
  fetch: HttpHandler;
  log: ToolingLog;
  connectorId: string;
  corpus: CorpusProfile;
  /** Natural language question. Omit to exercise the keyword-only arm. */
  semanticFilter?: string;
  kqlFilter?: string;
}

const toRetrievedPatterns = (categories: GetLogsCategory[]): RetrievedPattern[] =>
  categories.map((category) => ({
    pattern: category.pattern ?? '',
    message: category.sample?.message ?? category.pattern ?? '',
    count: category.count ?? 0,
  }));

/**
 * Runs `observability.get_logs` through the tool execution API.
 *
 * This bypasses the agent's tool selection on purpose: the retrieval arm measures
 * ranking quality, so the tool call has to be deterministic. It still goes
 * through the real registered tool and the real `semanticLogSearch` service, so
 * nothing about the production path is stubbed.
 */
export const executeGetLogs = async ({
  fetch,
  log,
  connectorId,
  corpus,
  semanticFilter,
  kqlFilter,
}: ExecuteGetLogsParams): Promise<GetLogsRun> => {
  const { target, timeRange, maxPatterns } = corpus;

  const response = await fetch<ToolExecuteResponse>('/api/agent_builder/tools/_execute', {
    method: 'POST',
    version: '2023-10-31',
    body: JSON.stringify({
      tool_id: GET_LOGS_TOOL_ID,
      connector_id: connectorId,
      tool_params: {
        start: timeRange.start,
        end: timeRange.end,
        index: target,
        limit: maxPatterns,
        ...(semanticFilter ? { semanticFilter } : {}),
        ...(kqlFilter ? { kqlFilter } : {}),
      },
    }),
  });

  const results = response.results ?? [];
  const errorResult = results.find((result) => result.type === 'error');

  if (errorResult) {
    const message = (errorResult.data as { message?: string } | undefined)?.message ?? 'unknown';
    log.error(`${GET_LOGS_TOOL_ID} returned an error: ${message}`);
    return { patterns: [], totalCount: 0, warnings: [], error: message };
  }

  const data = (results[0]?.data ?? {}) as GetLogsData;
  const warnings = data.warnings ?? [];

  if (warnings.length > 0) {
    log.warning(`${GET_LOGS_TOOL_ID} warnings: ${warnings.join('; ')}`);
  }

  return {
    patterns: toRetrievedPatterns(data.categories ?? []),
    totalCount: data.totalCount ?? 0,
    warnings,
  };
};
