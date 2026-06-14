/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  evaluate as base,
  createToolCallsEvaluator,
  createSpanLatencyEvaluator,
  type EvaluationDataset,
} from '@kbn/evals';
import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import { AgentBuilderClient } from './agent_builder_client';
import type { RcaExample, EvaluateRcaDataset, RcaTaskOutput } from './types';
import { createCriteriaFromGroundTruth } from './judges/criteria_from_ground_truth';

export const evaluate = base.extend<
  {},
  {
    agentClient: AgentBuilderClient;
    evaluateRcaDataset: EvaluateRcaDataset;
  }
>({
  agentClient: [
    async ({ fetch, log, connector }, use) => {
      const client = new AgentBuilderClient(fetch, log, connector.id, agentBuilderDefaultAgentId);
      await use(client);
    },
    { scope: 'worker' },
  ],

  evaluateRcaDataset: [
    ({ agentClient, evaluators, executorClient, traceEsClient, log }, use) => {
      use(async ({ dataset: { name, description, examples } }) => {
        await executorClient.runExperiment(
          {
            datasets: [{ name, description, examples } satisfies EvaluationDataset],
            task: async ({ input }): Promise<RcaTaskOutput> => {
              const { question, streamName, timeRange } = input as RcaExample['input'];

              const prompt = buildRcaPrompt(question, streamName, timeRange);

              const response = await agentClient.converse({
                messages: prompt,
                attachments: [
                  {
                    type: 'screen_context',
                    data: {
                      app: 'observability-overview',
                      time_range: timeRange,
                    },
                    hidden: true,
                  },
                ],
              });

              const responseText =
                response.messages[response.messages.length - 1]?.content ?? '';

              const toolCalls = (response.steps ?? [])
                .filter((s: any) => s.type === 'tool_call')
                .map((s: any) => s.tool_id as string);

              return {
                responseText,
                toolCalls,
                conversationId: response.conversationId,
                traceId: response.traceId,
                errors: response.errors,
              };
            },
          },
          [
            {
              name: 'Criteria',
              kind: 'LLM' as const,
              evaluate: async ({ output, expected, input, metadata }: any) => {
                const rcaOutput = output as RcaTaskOutput;
                const groundTruth = (expected as RcaExample['output']).groundTruth;
                const extraCriteria = (expected as RcaExample['output']).criteria ?? [];

                const criteria = [
                  ...createCriteriaFromGroundTruth(groundTruth),
                  ...extraCriteria,
                ];

                return evaluators
                  .criteria(criteria)
                  .evaluate({
                    input,
                    expected,
                    output: { responseText: rcaOutput.responseText },
                    metadata,
                  });
              },
            },
            createToolCallsEvaluator({ traceEsClient, log }),
            createSpanLatencyEvaluator({ traceEsClient, log, spanName: 'ChatComplete' }),
            evaluators.traceBasedEvaluators.inputTokens,
            evaluators.traceBasedEvaluators.outputTokens,
            evaluators.traceBasedEvaluators.cachedTokens,
          ]
        );
      });
    },
    { scope: 'worker' },
  ],
});

function buildRcaPrompt(
  question: string,
  streamName: string,
  timeRange: { from: string; to: string }
): string {
  return (
    `You are performing root cause analysis for an observability incident.\n` +
    `Data stream: ${streamName}\n` +
    `Time window: ${timeRange.from} to ${timeRange.to}\n\n` +
    `${question}\n\n` +
    `Investigate using available tools. ` +
    `When you have reached a conclusion, state:\n` +
    `- The root cause component (service, pod, or system)\n` +
    `- The failure reason\n` +
    `- The supporting evidence from the telemetry\n` +
    `If you cannot determine the root cause, explain what you found and why you cannot reach a conclusion.`
  );
}
