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
import type { KnowledgeBaseClient } from '../../src/clients/knowledge_base_client';

interface KnowledgeBaseExample extends Example {
  input: {
    question: string;
  };
  output: {
    criteria?: string[];
  };
}

export type EvaluateKnowledgeBaseDataset = ({
  dataset: { name, description, examples },
}: {
  dataset: {
    name: string;
    description: string;
    examples: KnowledgeBaseExample[];
  };
}) => Promise<void>;

export function createEvaluateKnowledgeBaseDataset({
  evaluators,
  phoenixClient,
  chatClient,
  knowledgeBaseClient,
}: {
  evaluators: DefaultEvaluators;
  phoenixClient: KibanaPhoenixClient;
  chatClient: ObservabilityAIAssistantEvaluationChatClient;
  knowledgeBaseClient: KnowledgeBaseClient;
}): EvaluateKnowledgeBaseDataset {
  return async function evaluateKnowledgeBaseDataset({
    dataset: { name, description, examples },
  }: {
    dataset: {
      name: string;
      description: string;
      examples: KnowledgeBaseExample[];
    };
  }) {
    await knowledgeBaseClient.ensureInstalled().catch((e) => {
      throw new Error(`Failed to install knowledge base: ${e.message}`);
    });

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
          name: 'kb-evaluator',
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
