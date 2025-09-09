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
} from '@kbn/onechat-plugin/common/http_api/chat';

export function createOneChatApiClient(supertest: Agent) {
  return {
    async converse(payload: ChatRequestBodyPayload): Promise<ChatResponse> {
      const res = await supertest
        .post('/api/chat/converse')
        .set('kbn-xsrf', 'true')
        .send(payload)
        .expect(200);

      return res.body;
    },
  };
}

export type OneChatApiClient = ReturnType<typeof createOneChatApiClient>;
