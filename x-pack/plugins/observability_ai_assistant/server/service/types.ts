/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IncomingMessage } from 'http';
import { KibanaRequest } from '@kbn/core/server';
import type {
  Conversation,
  ConversationCreateRequest,
  ConversationUpdateRequest,
  FunctionDefinition,
  Message,
} from '../../common/types';

export interface IObservabilityAIAssistantClient {
  chat: (options: {
    messages: Message[];
    connectorId: string;
    functions: Array<FunctionDefinition['options']>;
  }) => Promise<IncomingMessage>;
  get: (conversationId: string) => void;
  find: (options?: { query?: string }) => Promise<{ conversations: Conversation[] }>;
  create: (conversation: ConversationCreateRequest) => Promise<Conversation>;
  update: (conversation: ConversationUpdateRequest) => Promise<Conversation>;
  delete: (conversationId: string) => Promise<void>;
}

export interface IObservabilityAIAssistantService {
  getClient: (options: {
    request: KibanaRequest;
  }) => Promise<IObservabilityAIAssistantClient | undefined>;
}

export interface ObservabilityAIAssistantResourceNames {
  componentTemplate: {
    conversations: string;
  };
  indexTemplate: {
    conversations: string;
  };
  ilmPolicy: {
    conversations: string;
  };
  aliases: {
    conversations: string;
  };
  indexPatterns: {
    conversations: string;
  };
}
