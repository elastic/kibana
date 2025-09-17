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

interface EsqlExample extends Example {
  input: {
    question: string;
  };
  output: {
    expected?: string | string[];
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
                      `The generated ES|QL query should be syntactically valid and align with the intent of the user prompt. The query should be functionally equivalent
                      to the expected query or produce the same results, even if the syntax, structure, or column naming differs. If multiple expected queries are provided,
                      a match with any one of them is acceptable. Minor differences, such as variations in column names, formatting, or use of equivalent syntax, are acceptable
                      as long as they do not alter the semantics or outcome of the query.

                      Expected: ${expected.expected}`,
                    ]
                  : []),
                ...(expected.execute
                  ? [
                      'The query successfully executed without an error, and the agent summarized the results',
                    ]
                  : [
                      'The query execution was never attempted (no execution attempt, including failures), only an explanation was provided',
                    ]),
                ...(expected.criteria ?? []),
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
