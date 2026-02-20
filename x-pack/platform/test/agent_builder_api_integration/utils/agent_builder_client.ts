/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Agent } from 'supertest';
import type {
  ChatRequestBodyPayload,
  ChatResponse,
} from '@kbn/agent-builder-plugin/common/http_api/chat';
import type { Conversation } from '@kbn/agent-builder-common';

export type ExecutionMode = 'local' | 'task_manager';

export function createAgentBuilderApiClient(
  supertest: Agent,
  options?: { executionMode?: ExecutionMode }
) {
  return {
    async converse(payload: ChatRequestBodyPayload): Promise<ChatResponse> {
      const res = await supertest
        .post('/api/agent_builder/converse')
        .set('kbn-xsrf', 'true')
        .send({ ...payload, _execution_mode: options?.executionMode });
      return res.body;
    },

    async getConversation(conversationId: string): Promise<Conversation> {
      const res = await supertest
        .get(`/api/agent_builder/conversations/${conversationId}`)
        .set('kbn-xsrf', 'true');
      return res.body;
    },
  };
}

export type AgentBuilderApiClient = ReturnType<typeof createAgentBuilderApiClient>;
