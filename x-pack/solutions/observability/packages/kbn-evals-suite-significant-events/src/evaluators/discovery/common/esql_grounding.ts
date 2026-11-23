/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator, Example } from '@kbn/evals';
import { summarizeEsqlGrounding } from '../utils/tool_usage';
import type { AgentOutputBase } from '../types';

/**
 * Coarse grounding floor (shared by investigator + judge): once the agent ran `execute_esql`, did at
 * least one call return rows? Tool presence is covered by the agent-specific trajectory evaluators
 * (`createInvestigatorToolUsageEvaluator` / `createJudgeToolUsageEvaluator`), so this returns
 * `unavailable` when `execute_esql` was never called rather than double-penalizing.
 */
export function createExecuteEsqlGroundingEvaluator<
  TExample extends Example = Example,
  TTaskOutput extends AgentOutputBase = AgentOutputBase
>(): Evaluator<TExample, TTaskOutput> {
  return {
    name: 'execute_esql_grounding',
    kind: 'CODE',
    direction: 'maximize',
    evaluate: ({ output }) => {
      const { noOfToolCalls, noOfToolCallsWithResults, noOfToolCallsWithErrors } =
        summarizeEsqlGrounding(output.steps ?? []);

      if (noOfToolCalls === 0) {
        return Promise.resolve({
          score: null,
          label: 'unavailable',
          explanation: 'execute_esql was never called (tool presence is covered by trajectory)',
        });
      }

      const grounded = noOfToolCallsWithResults > 0;
      const noOfCallsWithoutResult =
        noOfToolCalls - noOfToolCallsWithResults - noOfToolCallsWithErrors;
      const failureReason =
        noOfToolCallsWithErrors === 0 && noOfCallsWithoutResult === 0
          ? `All ${noOfToolCalls} execute_esql call(s) returned zero rows`
          : [
              noOfToolCallsWithErrors > 0 &&
                `${noOfToolCallsWithErrors} execute_esql call(s) failed with a query error`,
              noOfCallsWithoutResult > 0 &&
                `${noOfCallsWithoutResult} execute_esql call(s) returned no result`,
              noOfToolCallsWithResults === 0 &&
                noOfToolCallsWithErrors + noOfCallsWithoutResult < noOfToolCalls &&
                'the remaining call(s) returned zero rows',
            ]
              .filter(Boolean)
              .join('; ');
      return Promise.resolve({
        score: grounded ? 1 : 0,
        explanation: grounded
          ? `${noOfToolCallsWithResults}/${noOfToolCalls} execute_esql call(s) returned rows${
              noOfToolCallsWithErrors > 0
                ? ` (${noOfToolCallsWithErrors} failed with a query error)`
                : ''
            }`
          : `${failureReason} — analysis not grounded in data`,
      });
    },
  };
}
