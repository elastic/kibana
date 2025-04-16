/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import type {
  ListConversationRequest,
  ListConversationResponse,
  GetConversationResponse,
} from '../../../common/http_api/conversation';

export class ConversationService {
  private readonly http: HttpSetup;

  constructor({ http }: { http: HttpSetup }) {
    this.http = http;
  }

  async list(request: ListConversationRequest) {
    const response = await this.http.post<ListConversationResponse>(
      '/internal/workchat/conversations',
      {
        body: JSON.stringify(request),
      }
    );
    return response.conversations;
  }

  async get(conversationId: string) {
    return await this.http.get<GetConversationResponse>(
      `/internal/workchat/conversations/${conversationId}`
    );
  }
}
