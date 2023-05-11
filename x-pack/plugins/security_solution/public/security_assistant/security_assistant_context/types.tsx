/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecurityAssistantUiSettings } from '../helpers';

export type ConversationRole = 'system' | 'user' | 'assistant';
export interface Message {
  role: ConversationRole;
  content: string;
  timestamp: string;
}

/**
 * Complete state to reconstruct a conversation instance.
 * Includes all messages, API configuration, and relevant UI state.
 *
 * Currently only conversation will be stored in localstorage, no secrets plz!
 */
export interface Conversation {
  id: string;
  messages: Message[];
  apiConfig: {
    openAI: SecurityAssistantUiSettings['openAI'];
    virusTotal: SecurityAssistantUiSettings['virusTotal'];
  };
}
