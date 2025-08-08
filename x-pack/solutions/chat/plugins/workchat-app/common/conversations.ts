/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UserNameAndId } from './shared';
import type { ConversationEvent } from './conversation_events';

export interface Conversation {
  id: string;
  agentId: string;
  title: string;
  lastUpdated: string;
  user: UserNameAndId;
  events: ConversationEvent[];
}

/**
 * Summary of conversation, e.g. for the conversation listing
 */
export interface ConversationSummary {
  id: string;
  agentId: string;
  title: string;
  lastUpdated: string;
}

export type ConversationCreateRequest = Omit<Conversation, 'id' | 'lastUpdated' | 'user'> & {
  id?: string;
};
