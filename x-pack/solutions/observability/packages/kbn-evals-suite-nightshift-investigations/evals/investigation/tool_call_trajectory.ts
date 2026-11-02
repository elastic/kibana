/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isToolCallStep, ToolResultType } from '@kbn/agent-builder-common';
import type { ConversationRound, ToolResult } from '@kbn/agent-builder-common';
import type { TrajectoryStep } from './types';

/**
 * Bounded, best-effort text rendering of one tool call's result(s): the judges that need this
 * (rca_anti_leakage, truthfulness, decision_tree_helpfulness) only need to read what happened,
 * not replay it, so a lossy summary of each known result shape is enough.
 */
const renderResult = (results: readonly ToolResult[]): string =>
  results
    .map(({ type, data }) => {
      if (type === ToolResultType.error) {
        return `Error: ${(data as { message?: unknown }).message ?? 'unknown error'}`;
      }
      if ('text' in data) return String((data as { text: unknown }).text);
      if ('stdout' in data || 'stderr' in data || 'exit_code' in data) {
        const {
          stdout,
          stderr,
          exit_code: exitCode,
        } = data as {
          stdout?: unknown;
          stderr?: unknown;
          exit_code?: unknown;
        };
        const parts = [`exit_code: ${exitCode}`];
        if (stdout) parts.push(`stdout: ${stdout}`);
        if (stderr) parts.push(`stderr: ${stderr}`);
        return parts.join(' | ');
      }
      return JSON.stringify(data);
    })
    .join('\n');

/**
 * The full ordered sequence of tool calls the investigation made, each with its arguments and a
 * rendered result. Unlike `structured_report`, this is the agent's actual accessed trajectory
 * rather than the model's own selected summary of it, so judges that must reason about what the
 * agent really saw and in what order (leakage, evidence-groundedness, decision-tree helpfulness)
 * can use it instead of the report's self-reported evidence.
 */
export const extractToolCallTrajectory = (
  rounds: Array<Pick<ConversationRound, 'steps'>>
): TrajectoryStep[] =>
  rounds.flatMap(({ steps }) =>
    steps.filter(isToolCallStep).map(({ tool_id: toolId, params, results }) => ({
      tool_id: toolId,
      params,
      result: renderResult(results),
    }))
  );
