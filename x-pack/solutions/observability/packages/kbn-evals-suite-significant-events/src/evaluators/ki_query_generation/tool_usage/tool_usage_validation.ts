/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator } from '@kbn/evals';
import type { KIQueryGenerationToolUsage } from '../types';

interface ToolUsageTaskOutput {
  toolUsage?: KIQueryGenerationToolUsage;
}

export const createToolUsageEvaluator = (): Evaluator => ({
  name: 'tool_usage_validation',
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output }) => {
    const toolUsage = (output as ToolUsageTaskOutput)?.toolUsage;

    if (!toolUsage) {
      return {
        score: null,
        label: 'unavailable',
        explanation: 'No toolUsage data returned from task',
      };
    }

    const scores: number[] = [];
    const issues: string[] = [];

    if (toolUsage.get_features.calls >= 1) {
      scores.push(1);
    } else {
      scores.push(0);
      issues.push('get_features was never called');
    }

    if (toolUsage.validate_queries.calls >= 1) {
      scores.push(1);
    } else {
      scores.push(0);
      issues.push('validate_queries was never called');
    }

    const totalCalls = toolUsage.get_features.calls + toolUsage.validate_queries.calls;
    const totalFailures = toolUsage.get_features.failures + toolUsage.validate_queries.failures;

    if (totalCalls > 0) {
      const successRate = 1 - totalFailures / totalCalls;
      scores.push(successRate);
      if (totalFailures > 0) {
        issues.push(`${totalFailures}/${totalCalls} tool calls failed`);
      }
    }

    const score = scores.reduce((sum, s) => sum + s, 0) / scores.length;

    return {
      score,
      explanation:
        issues.length > 0
          ? issues.join('; ')
          : `All tool calls succeeded (get_features: ${toolUsage.get_features.calls}, validate_queries: ${toolUsage.validate_queries.calls})`,
      metadata: {
        get_features: toolUsage.get_features,
        validate_queries: toolUsage.validate_queries,
      },
    };
  },
});
