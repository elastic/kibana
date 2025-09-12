/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Conversation, ConversationSummary } from '../conversations';

export interface ListConversationRequest {
  /**
   * If specified, will only fetch conversations for this agent.
   */
  agentId?: string;
}

export interface ListConversationResponse {
  conversations: ConversationSummary[];
}

export type GetConversationResponse = Conversation;
