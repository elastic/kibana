/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Example } from '@arizeai/phoenix-client/dist/esm/types/datasets';
import { DefaultEvaluators, KibanaPhoenixClient } from '@kbn/evals';
import { EvaluationDataset } from '@kbn/evals/src/types';
import { ObservabilityAIAssistantEvaluationChatClient } from '../../src/chat_client';

interface EsqlExample extends Example {
  input: {
    question: string;
  };
  output: {
    expected?: string;
    criteria?: string[];
    execute?: boolean;
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
        {
          name: 'esql-evaluator',
          kind: 'LLM',
          evaluate: async ({ input, output, expected, metadata }) => {
            const result = await evaluators
              .criteria([
                ...(expected.expected
                  ? [
                      `Returns a ES|QL query that is functionally equivalent to:
      ${expected.expected}. It's OK if the created column names are slightly different, as long as the expected end result is the same.`,
                    ]
                  : []),
                ...(expected.execute
                  ? [
                      'The query successfully executed without an error, and the agent summarized the results',
                    ]
                  : ['The query was not executed, it was only explained']),
                ...[],
              ])
              .evaluate({
                input,
                expected,
                output,
                metadata,
              });

            return result;
          },
        },
      ]
    );
  };
}
