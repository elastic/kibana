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
import { createCriteriaEvaluator } from '../../src/common_evaluators';

interface EsqlExample extends Example {
  input: {
    question: string;
  };
  output: {
    expected?: string | string[];
    criteria?: string[];
  };
}

export type EvaluateEsqlDataset = ({
  dataset: { name, description, examples },
}: {
  dataset: {
    name: string;
    description: string;
    examples: EsqlExample[];
  };
}) => Promise<void>;

export function createEvaluateEsqlDataset({
  evaluators,
  phoenixClient,
  chatClient,
}: {
  evaluators: DefaultEvaluators;
  phoenixClient: KibanaPhoenixClient;
  chatClient: ObservabilityAIAssistantEvaluationChatClient;
}): EvaluateEsqlDataset {
  return async function evaluateEsqlDataset({
    dataset: { name, description, examples },
  }: {
    dataset: {
      name: string;
      description: string;
      examples: EsqlExample[];
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
        createCriteriaEvaluator({
          evaluators,
        }),
      ]
    );
  };
}
