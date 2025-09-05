/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Example } from '@arizeai/phoenix-client/dist/esm/types/datasets';
import type { DefaultEvaluators, KibanaPhoenixClient } from '@kbn/evals';
import type { EvaluationDataset } from '@kbn/evals/src/types';
import type { AssistantScope } from '@kbn/ai-assistant-common';
import { MessageRole } from '@kbn/observability-ai-assistant-plugin/common';
import type { ObservabilityAIAssistantEvaluationChatClient } from '../../src/chat_client';

interface ElasticsearchExample extends Example {
  input: {
    prompt: string;
    scope?: AssistantScope;
    followUps?: string[];
  };
  output: {
    criteria: string[];
  };
}

export type EvaluateElasticsearchDataset = ({
  dataset: { name, description, examples },
}: {
  dataset: {
    name: string;
    description: string;
    examples: ElasticsearchExample[];
  };
}) => Promise<void>;

export function createEvaluateElasticsearchDataset({
  evaluators,
  phoenixClient,
  chatClient,
}: {
  evaluators: DefaultEvaluators;
  phoenixClient: KibanaPhoenixClient;
  chatClient: ObservabilityAIAssistantEvaluationChatClient;
}): EvaluateElasticsearchDataset {
  return async function evaluateElasticsearchDataset({
    dataset: { name, description, examples },
  }: {
    dataset: {
      name: string;
      description: string;
      examples: ElasticsearchExample[];
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
          let response = await chatClient.complete({
            messages: input.prompt,
            scope: input.scope,
          });

          for (const followUp of input.followUps ?? []) {
            response = await chatClient.complete({
              conversationId: response.conversationId,
              messages: response.messages.concat({
                content: followUp,
                role: MessageRole.User,
              }),
              scope: input.scope,
            });
          }

          return {
            errors: response.errors,
            messages: response.messages,
          };
        },
      },
      [
        {
          name: 'elasticsearch-evaluator',
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
