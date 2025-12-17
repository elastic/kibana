/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { evaluate as base, createDefaultTerminalReporter } from '@kbn/evals';
import { KnowledgeBaseClient } from './clients/knowledge_base_client';
import { ConversationsClient } from './clients/conversations_client';
import { createChatClient, type ChatClient } from './clients/chat';
import type { EvaluateObservabilityAIAssistantDataset } from './evaluate_dataset';
import { createEvaluateObservabilityAIAssistantDataset } from './evaluate_dataset';
import { createScenarioSummaryReporter } from './scenario_summary_reporter';

export const evaluate = base.extend<
  {},
  {
    knowledgeBaseClient: KnowledgeBaseClient;
    conversationsClient: ConversationsClient;
    chatClient: ChatClient;
    evaluateDataset: EvaluateObservabilityAIAssistantDataset;
  }
>({
  knowledgeBaseClient: [
    async ({ fetch, log, esClient }, use) => {
      const kbClient = new KnowledgeBaseClient(fetch, log, esClient);

      await use(kbClient);
    },
    {
      scope: 'worker',
    },
  ],
  conversationsClient: [
    async ({ log, esClient }, use) => {
      const convClient = new ConversationsClient(log, esClient);
      await use(convClient);
    },
    {
      scope: 'worker',
    },
  ],
  chatClient: [
    async ({ fetch, log, connector, knowledgeBaseClient }, use) => {
      // Ensure the KB fixture is initialized before creating the chat client.
      // This guarantees KB is installed even if no spec references knowledgeBaseClient directly.
      await knowledgeBaseClient.ensureInstalled();

      const chatClient = createChatClient(fetch, log, connector.id);
      await use(chatClient);
    },
    {
      scope: 'worker',
    },
  ],
  evaluateDataset: [
    ({ chatClient, evaluators, phoenixClient }, use) => {
      use(
        createEvaluateObservabilityAIAssistantDataset({
          chatClient,
          evaluators,
          phoenixClient,
        })
      );
    },
    { scope: 'worker' },
  ],
  reportModelScore: [
    async ({ reportDisplayOptions }, use) => {
      const useScenarioReporting = process.env.SCENARIO_REPORTING === 'true';

      if (useScenarioReporting) {
        await use(createScenarioSummaryReporter({ reportDisplayOptions }));
      } else {
        await use(createDefaultTerminalReporter({ reportDisplayOptions }));
      }
    },
    { scope: 'worker' },
  ],
});
