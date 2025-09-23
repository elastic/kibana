/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { evaluate as base } from '@kbn/evals';
import { KnowledgeBaseClient } from './clients/knowledge_base_client';
import { ConversationsClient } from './clients/conversations_client';
import { ObservabilityAIAssistantEvaluationChatClient } from './chat_client';

export const evaluate = base.extend<
  {},
  {
    knowledgeBaseClient: KnowledgeBaseClient;
    conversationsClient: ConversationsClient;
    chatClient: ObservabilityAIAssistantEvaluationChatClient;
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

      const chatClient = new ObservabilityAIAssistantEvaluationChatClient(fetch, log, connector.id);
      await use(chatClient);
    },
    {
      scope: 'worker',
    },
  ],
});
