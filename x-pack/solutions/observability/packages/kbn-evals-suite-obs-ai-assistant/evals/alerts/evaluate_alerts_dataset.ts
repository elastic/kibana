/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Example } from '@arizeai/phoenix-client/dist/esm/types/datasets';
import type { DefaultEvaluators, KibanaPhoenixClient } from '@kbn/evals';
import type { EvaluationDataset } from '@kbn/evals/src/types';
import type { ObservabilityAIAssistantEvaluationChatClient } from '../../src/chat_client';

interface AlertsExample extends Example {
  input: {
    question: string;
  };
  output: {
    criteria?: string[];
  };
}

export type EvaluateAlertsDataset = ({
  dataset: { name, description, examples },
}: {
  dataset: {
    name: string;
    description: string;
    examples: AlertsExample[];
  };
}) => Promise<void>;

export function createEvaluateAlertsDataset({
  evaluators,
  phoenixClient,
  chatClient,
}: {
  evaluators: DefaultEvaluators;
  phoenixClient: KibanaPhoenixClient;
  chatClient: ObservabilityAIAssistantEvaluationChatClient;
}): EvaluateAlertsDataset {
  return async function evaluateAlertsDataset({
    dataset: { name, description, examples },
  }: {
    dataset: {
      name: string;
      description: string;
      examples: AlertsExample[];
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
          });

          return {
            errors: response.errors,
            messages: response.messages,
          };
        },
      },
      [
        {
          name: 'alerts-evaluator',
          kind: 'LLM',
          evaluate: async ({ input, output, expected, metadata }) => {
            const result = await evaluators
              .criteria(expected.criteria ?? [])
              .evaluate({ input, expected, output, metadata });

            return result;
          },
        },
      ]
    );
  };
}
