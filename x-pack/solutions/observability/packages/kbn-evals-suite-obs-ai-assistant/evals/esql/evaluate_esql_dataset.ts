/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Example } from '@arizeai/phoenix-client/dist/esm/types/datasets';
import { executeAsEsqlAgent } from '@kbn/ai-tools';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { DefaultEvaluators, KibanaPhoenixClient } from '@kbn/evals';
import type { EvaluationDataset } from '@kbn/evals/src/types';
import type { BoundInferenceClient } from '@kbn/inference-common';
import { MessageRole } from '@kbn/inference-common';
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
  inferenceClient,
  logger,
  signal,
  esClient,
}: {
  evaluators: DefaultEvaluators;
  phoenixClient: KibanaPhoenixClient;
  chatClient: ObservabilityAIAssistantEvaluationChatClient;
  signal: AbortSignal;
  inferenceClient: BoundInferenceClient;
  logger: Logger;
  esClient: ElasticsearchClient;
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
          const response = await executeAsEsqlAgent({
            inferenceClient,
            esClient,
            logger,
            prompt: input.question,
            signal,
            toolCallbacks: {},
            tools: {},
          });

          const executedQueries: string[] = [];

          response.input.forEach((message) => {
            if (message.role === MessageRole.Tool && message.name === 'run_queries') {
              executedQueries.push(
                ...message.response.responses.map((res) =>
                  typeof res.query === 'string' ? res.query : res.query.output
                )
              );
            }
          });

          return {
            content: response.content,
            executed_queries: executedQueries,
          };
          // const response = await chatClient.complete({
          //   messages: [
          //     {
          //       role: 'user' as MessageRole,
          //       content: `${input.question}. If you end up generating and/or executing a query, provide the full query in your final response. Don't ask for feedback or guidance, just provide a definitive answer and this is an unsupervised chat.`,
          //     },
          //   ],
          // });

          // const messages: Array<Message['message']> = [];

          // if (response.messages[response.messages.length - 1].name?.includes('query')) {
          //   messages.push(...response.messages.slice(-3));
          // } else {
          //   messages.push(...response.messages.slice(-1));
          // }

          // return {
          //   messages,
          //   errors: response.errors,
          // };
        },
      },
      [
        {
          name: 'esql-evaluator',
          kind: 'LLM',
          evaluate: async ({ input, output, expected, metadata }) => {
            const result = await evaluators
              .criteria([
                ...(expected.criteria ?? []),
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
