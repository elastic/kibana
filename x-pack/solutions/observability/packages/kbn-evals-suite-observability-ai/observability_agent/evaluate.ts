/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  evaluate as base,
  createSpanLatencyEvaluator,
  getCurrentTraceId,
  type EvaluationDataset,
  type Example,
} from '@kbn/evals';
import { AgentBuilderClient } from '../src/clients/chat/agent_builder_client';
import type { ConverseAttachment } from '../src/clients/chat/types';
import { createCriteriaEvaluator } from '../src/evaluate_dataset';

const OBSERVABILITY_AGENT_ID = 'observability.agent';

interface ObservabilityAgentExample extends Example {
  input: {
    question: string;
    attachments?: ConverseAttachment[];
  };
  output: {
    criteria: string[];
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
      const client = new AgentBuilderClient(fetch, log, connector.id, OBSERVABILITY_AGENT_ID);
      await use(client);
    },
    { scope: 'worker' },
  ],
  evaluateDataset: [
    ({ chatClient, evaluators, executorClient, traceEsClient, log }, use) => {
      use(async ({ dataset: { name, description, examples } }) => {
        await executorClient.runExperiment(
          {
            dataset: { name, description, examples } satisfies EvaluationDataset,
            task: async ({ input }) => {
              const response = await chatClient.converse({
                messages: input.question,
                attachments: input.attachments,
              });

              const traceId = getCurrentTraceId();

              return {
                errors: response.errors,
                messages: response.messages,
                steps: response.steps,
                traceId,
              };
            },
          },
          [
            createCriteriaEvaluator({ evaluators }),
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
