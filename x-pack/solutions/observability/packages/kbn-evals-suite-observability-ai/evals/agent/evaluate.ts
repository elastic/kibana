/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  evaluate as base,
  createQuantitativeCorrectnessEvaluators,
  createSpanLatencyEvaluator,
  createToolCallsEvaluator,
  createTrajectoryEvaluator,
  type EvaluationDataset,
  type Example,
} from '@kbn/evals';
import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import { AgentBuilderClient } from '../../src/clients/chat/agent_builder_client';
import type { ConverseAttachment } from '../../src/clients/chat/types';
import { createCriteriaEvaluator } from '../../src/criteria_evaluator';

interface ObservabilityAgentExample extends Example {
  input: {
    question: string;
    attachments?: ConverseAttachment[];
  };
  output: {
    criteria?: string[];
    expected?: string;
    expectedTools?: string[];
  };
}

export type EvaluateObservabilityAgentDataset = (params: {
  dataset: {
    name: string;
    description: string;
    examples: ObservabilityAgentExample[];
  };
}) => Promise<void>;

export const evaluate = base.extend<
  {},
  {
    chatClient: AgentBuilderClient;
    evaluateDataset: EvaluateObservabilityAgentDataset;
  }
>({
  chatClient: [
    async ({ fetch, log, connector }, use) => {
      const client = new AgentBuilderClient(fetch, log, connector.id, agentBuilderDefaultAgentId);
      await use(client);
    },
    { scope: 'worker' },
  ],
  evaluateDataset: [
    ({ chatClient, evaluators, executorClient, traceEsClient, log }, use) => {
      use(async ({ dataset: { name, description, examples } }) => {
        const includeQuantitativeCorrectness = examples.some((example) =>
          Boolean(example.output.expected)
        );

        const includeToolCoverage = examples.some((example) =>
          Boolean(example.output.expectedTools?.length)
        );

        await executorClient.runExperiment(
          {
            dataset: { name, description, examples } satisfies EvaluationDataset,
            task: async ({ input, output, metadata }) => {
              const response = await chatClient.converse({
                messages: input.question,
                attachments: input.attachments,
              });

              const correctnessResult = output.expected
                ? await evaluators.correctnessAnalysis().evaluate({
                    input,
                    expected: { expected: output.expected },
                    output: {
                      messages: [response.messages[response.messages.length - 1]].map(
                        (message) => ({
                          message: message.content,
                        })
                      ),
                    },
                    metadata,
                  })
                : undefined;

              return {
                errors: response.errors,
                messages: response.messages,
                steps: response.steps,
                correctnessAnalysis: correctnessResult?.metadata,
                traceId: response.traceId,
              };
            },
          },
          [
            createCriteriaEvaluator({ evaluators }),
            ...(includeQuantitativeCorrectness ? createQuantitativeCorrectnessEvaluators() : []),
            ...(includeToolCoverage
              ? [
                  createTrajectoryEvaluator({
                    extractToolCalls: (output: unknown) => {
                      const steps = (output as any)?.steps ?? [];
                      return steps
                        .filter((s: any) => s.type === 'tool_call')
                        .map((s: any) => s.tool_id as string);
                    },
                    goldenPathExtractor: (expected: unknown) => {
                      return (expected as any)?.expectedTools ?? [];
                    },
                    orderWeight: 0,
                    coverageWeight: 1,
                  }),
                ]
              : []),
            createToolCallsEvaluator({ traceEsClient, log }),
            evaluators.traceBasedEvaluators.inputTokens,
            evaluators.traceBasedEvaluators.outputTokens,
            evaluators.traceBasedEvaluators.cachedTokens,
            createSpanLatencyEvaluator({ traceEsClient, log, spanName: 'ChatComplete' }),
          ]
        );
      });
    },
    { scope: 'worker' },
  ],
});
