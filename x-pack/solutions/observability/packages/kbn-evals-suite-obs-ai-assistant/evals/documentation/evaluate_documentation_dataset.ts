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
import type { ObservabilityAIAssistantEvaluationChatClient } from '../../src/chat_client';

interface DocumentationExample extends Example {
  input: {
    prompt: string;
    scope?: AssistantScope;
  };
  output: {
    criteria: string[];
  };
}

export type EvaluateDocumentationDataset = ({
  dataset: { name, description, examples },
}: {
  dataset: {
    name: string;
    description: string;
    examples: DocumentationExample[];
  };
}) => Promise<void>;

export function createEvaluateDocumentationDataset({
  evaluators,
  phoenixClient,
  chatClient,
}: {
  evaluators: DefaultEvaluators;
  phoenixClient: KibanaPhoenixClient;
  chatClient: ObservabilityAIAssistantEvaluationChatClient;
}): EvaluateDocumentationDataset {
  return async function evaluateDocumentationDataset({
    dataset: { name, description, examples },
  }: {
    dataset: {
      name: string;
      description: string;
      examples: DocumentationExample[];
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
            messages: input.prompt,
            scope: input.scope,
          });

          return {
            errors: response.errors,
            messages: response.messages,
          };
        },
      },
      [
        {
          name: 'documentation-evaluator',
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
