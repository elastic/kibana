/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createQuantitativeCorrectnessEvaluators,
  createQuantitativeGroundednessEvaluator,
  type DefaultEvaluators,
  type EvaluationDataset,
  type EvalsExecutorClient,
  type Example,
} from '@kbn/evals';
import type { AssistantScope } from '@kbn/ai-assistant-common';
import type { ChatClient } from './clients/chat';

interface ObservabilityAIAssistantDatasetExample extends Example {
  input: {
    question: string;
    scope?: AssistantScope;
  };
  output: {
    criteria: string[];
  };
}

export type EvaluateObservabilityAIAssistantDataset = ({
  dataset: { name, description, examples },
}: {
  dataset: {
    name: string;
    description: string;
    examples: ObservabilityAIAssistantDatasetExample[];
  };
}) => Promise<void>;

export function createEvaluateObservabilityAIAssistantDataset({
  evaluators,
  phoenixClient,
  chatClient,
}: {
  evaluators: DefaultEvaluators;
  phoenixClient: EvalsExecutorClient;
  chatClient: ChatClient;
}): EvaluateObservabilityAIAssistantDataset {
  return async function evaluateObservabilityAIAssistantDataset({
    dataset: { name, description, examples },
  }: {
    dataset: {
      name: string;
      description: string;
      examples: ObservabilityAIAssistantDatasetExample[];
    };
  }) {
    const dataset = {
      name,
      description,
      examples,
    } satisfies EvaluationDataset;

    /**
     * We're still defaulting our reporting to criteria only. Correctness and groundedness don't work reliably with our
     * current LLM judge of choice (Gemini 2.5 Pro), causing timeouts and occasional malformed tool calls.
     */
    const useQualitativeEvaluators = process.env.USE_QUALITATIVE_EVALUATORS === 'true';

    await phoenixClient.runExperiment(
      {
        dataset,
        task: async ({ input, output, metadata }) => {
          const response = await chatClient.converse({
            messages: input.question,
            scope: input.scope,
          });

          const result: any = {
            errors: response.errors,
            messages: response.messages,
          };

          if (useQualitativeEvaluators) {
            const qualitativeAnalysisInput = {
              input,
              expected: {
                expected: output.criteria.join('\n'),
              },
              output: {
                messages: [response.messages[response.messages.length - 1]].map((message) => ({
                  message: message.content,
                })),
                steps: response.messages,
              },
              metadata,
            };
            const [correctnessResult, groundednessResult] = await Promise.all([
              evaluators.correctnessAnalysis().evaluate(qualitativeAnalysisInput),
              evaluators.groundednessAnalysis().evaluate(qualitativeAnalysisInput),
            ]);

            if (correctnessResult?.metadata)
              result.correctnessAnalysis = correctnessResult.metadata;
            if (groundednessResult?.metadata)
              result.groundednessAnalysis = groundednessResult.metadata;
          }

          return result;
        },
      },
      [
        createCriteriaEvaluator({
          evaluators,
        }),
        ...(useQualitativeEvaluators
          ? [
              createQuantitativeGroundednessEvaluator(),
              ...createQuantitativeCorrectnessEvaluators(),
            ]
          : []),
      ]
    );
  };
}

/**
 * Common criteria evaluator that can be used across all evaluation scenarios.
 * This provides a standardized evaluator with a consistent name "Criteria".
 * All evaluators simply extract criteria from expected.criteria.
 */
export function createCriteriaEvaluator({ evaluators }: { evaluators: DefaultEvaluators }) {
  return {
    name: 'Criteria',
    kind: 'LLM' as const,
    evaluate: async ({ input, output, expected, metadata }: any) => {
      const criteria = expected.criteria ?? [];
      const result = await evaluators
        .criteria(criteria)
        .evaluate({ input, expected, output, metadata });

      return result;
    },
  };
}
