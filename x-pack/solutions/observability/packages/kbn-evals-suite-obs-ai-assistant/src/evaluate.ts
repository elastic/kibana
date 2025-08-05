/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { evaluate as base } from '@kbn/evals';
import { KnowledgeBaseClient } from './knowledge_base_client';
import { ObservabilityAIAssistantEvaluationChatClient } from './chat_client';

export const evaluate = base.extend<
  {},
  {
    knowledgeBaseClient: KnowledgeBaseClient;
    chatClient: ObservabilityAIAssistantEvaluationChatClient;
  }
>({
  knowledgeBaseClient: [
    async ({ fetch, log }, use) => {
      const kbClient = new KnowledgeBaseClient(fetch, log);

      await use(kbClient);
    },
    {
      scope: 'worker',
    },
  ],
  chatClient: [
    async ({ fetch, log, connector }, use, testInfo) => {
      const chatClient = new ObservabilityAIAssistantEvaluationChatClient(fetch, log, connector.id);

      await use(chatClient);
    },
    {
      scope: 'worker',
    },
  ],
});
