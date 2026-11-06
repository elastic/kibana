/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BoundInferenceClient, ToolChoice } from '@kbn/inference-common';
import type { ToolingLog } from '@kbn/tooling-log';
import { ElasticGenAIAttributes, withActiveInferenceSpan } from '@kbn/inference-tracing';
import pRetry from 'p-retry';
import type { EvalConnector, Evaluator } from '@kbn/evals';
import { buildModelFromConnector } from '@kbn/evals';
import type { InvestigationExample, InvestigationTaskOutput } from '../types';

export type InvestigationEvaluator = Evaluator<InvestigationExample, InvestigationTaskOutput>;

export interface JudgeDeps {
  inferenceClient: BoundInferenceClient;
  evaluationConnector: EvalConnector;
  log: ToolingLog;
}

/** Model attribution matching the built-in `evaluators` fixture (`toScoreModel(...)`). */
export const getModelFactory = (evaluationConnector: EvalConnector) => () => {
  const model = buildModelFromConnector(evaluationConnector);
  if (!model.id) return undefined;
  return {
    id: model.id,
    ...(model.family ? { family: model.family } : {}),
    ...(model.provider ? { provider: model.provider } : {}),
  };
};

/**
 * Runs one prompt with retries and returns the arguments of its forced tool call (`score` unless
 * `tool` names another). `validate` may throw to reject a malformed answer, which is retried.
 *
 * The `inferenceClient.prompt` REST call does not create a client-side inference span, so it must
 * run inside an active inference span for the server-side `gen_ai` chat span to be captured under
 * this evaluator's trace (and exported to the tracing cluster). This mirrors the built-in kbn-evals
 * LLM evaluators, which get the same span via `executeUntilValid` → `withActiveInferenceSpan`.
 * Without this wrap the judge model call emits no queryable `gen_ai` span.
 */
export const invokeJudge = async <TArgs>(
  { inferenceClient, log }: Pick<JudgeDeps, 'inferenceClient' | 'log'>,
  name: string,
  prompt: Parameters<BoundInferenceClient['prompt']>[0]['prompt'],
  input: Record<string, unknown>,
  { tool = 'score', validate }: { tool?: string; validate?: (args: TArgs) => void } = {}
): Promise<TArgs> =>
  withActiveInferenceSpan(
    name,
    { attributes: { [ElasticGenAIAttributes.InferenceSpanKind]: 'CHAIN' } },
    () =>
      pRetry(
        async () => {
          const response = await inferenceClient.prompt({
            prompt,
            input,
            toolChoice: { function: tool } as ToolChoice,
          });
          const toolCall = response.toolCalls[0];
          if (!toolCall) throw new Error(`No tool call returned by the ${name} judge`);
          const args = toolCall.function.arguments as TArgs;
          validate?.(args);
          return args;
        },
        {
          retries: 3,
          onFailedAttempt: (error) => {
            log.warning(`${name} judge attempt ${error.attemptNumber} failed: ${error.message}`);
          },
        }
      )
  );

/**
 * Runs `run` once per investigation. Two evaluators fed by one judge call share its verdict, so
 * the judge isn't paid for twice; a run without an investigation id can't be keyed and isn't shared.
 */
export const createRunMemo = <T>() => {
  const cache = new Map<string, Promise<T>>();
  return (output: InvestigationTaskOutput, run: () => Promise<T>): Promise<T> => {
    const key = output.investigation_id;
    if (!key) return run();
    const cached = cache.get(key);
    if (cached) return cached;
    const pending = run();
    cache.set(key, pending);
    pending.catch(() => cache.delete(key));
    return pending;
  };
};
