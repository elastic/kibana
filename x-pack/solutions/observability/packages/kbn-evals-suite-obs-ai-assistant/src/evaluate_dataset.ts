/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DefaultEvaluators, EvaluationDataset, KibanaPhoenixClient } from '@kbn/evals';
import type { Example } from '@arizeai/phoenix-client/dist/esm/types/datasets';
import type { AssistantScope } from '@kbn/ai-assistant-common';
import type { ObservabilityAIAssistantEvaluationChatClient } from './chat_client';

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
  phoenixClient: KibanaPhoenixClient;
  chatClient: ObservabilityAIAssistantEvaluationChatClient;
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

    await phoenixClient.runExperiment(
      {
        dataset,
        task: async ({ input }) => {
          const response = await chatClient.complete({
            messages: input.question,
            scope: input.scope,
          });

          return {
            errors: response.errors,
            messages: response.messages,
          };
        },
      },
      [
        createCriteriaEvaluator({
          evaluators,
        }),
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
