/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  evaluate as base,
  createQuantitativeCorrectnessEvaluators,
  createSpanLatencyEvaluator,
  getCurrentTraceId,
  type EvaluationDataset,
  type Example,
} from '@kbn/evals';
import { AiInsightClient, type AiInsightResponse } from '../src/clients/ai_insight_client';

export interface AiInsightExample<TPayload> extends Example {
  input: { requestPayload: TPayload; question: string };
  output: { expected: string };
}

type InsightFetcher<TPayload> = (payload: TPayload) => Promise<AiInsightResponse>;

type EvaluateAiInsightsDataset = <TPayload>(params: {
  getInsight: InsightFetcher<TPayload>;
  dataset: { name: string; description: string; examples: AiInsightExample<TPayload>[] };
}) => Promise<void>;

export const evaluate = base.extend<
  {},
  { aiInsightClient: AiInsightClient; evaluateDataset: EvaluateAiInsightsDataset }
>({
  aiInsightClient: [({ fetch }, use) => use(new AiInsightClient(fetch)), { scope: 'worker' }],
  evaluateDataset: [
    ({ evaluators, executorClient, traceEsClient, log }, use) => {
      use(
        async <TPayload>({
          getInsight,
          dataset: { name, description, examples },
        }: {
          getInsight: InsightFetcher<TPayload>;
          dataset: { name: string; description: string; examples: AiInsightExample<TPayload>[] };
        }) => {
          await executorClient.runExperiment(
            {
              dataset: { name, description, examples } satisfies EvaluationDataset,
              task: async ({ input, output, metadata }) => {
                const response = await getInsight(input.requestPayload as TPayload);
                const correctnessResult = await evaluators.correctnessAnalysis().evaluate({
                  input,
                  expected: { expected: output.expected },
                  output: { messages: [{ message: response.summary }] },
                  metadata,
                });
                const traceId = getCurrentTraceId();
                return {
                  summary: response.summary,
                  context: response.context,
                  correctnessAnalysis: correctnessResult?.metadata,
                  traceId,
                };
              },
            },
            [
              ...createQuantitativeCorrectnessEvaluators(),
              evaluators.traceBasedEvaluators.inputTokens,
              evaluators.traceBasedEvaluators.outputTokens,
              evaluators.traceBasedEvaluators.cachedTokens,
              createSpanLatencyEvaluator({ traceEsClient, log, spanName: 'ChatComplete' }),
            ]
          );
        }
      );
    },
    { scope: 'worker' },
  ],
});
