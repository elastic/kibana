/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Serializable } from '@kbn/utility-types';

export enum MessageRole {
  System = 'system',
  Assistant = 'assistant',
  User = 'user',
  Function = 'function',
  Elastic = 'elastic',
}

export interface Message {
  '@timestamp': string;
  message: {
    content?: string;
    name?: string;
    event?: string;
    role: MessageRole;
    function_call?: {
      name: string;
      args?: Serializable;
      trigger: MessageRole.Assistant | MessageRole.User | MessageRole.Elastic;
    };
    data?: Serializable;
  };
}

export interface Conversation {
  '@timestamp': string;
  user: {
    id?: string;
    name: string;
  };
  conversation: {
    id: string;
    title: string;
    last_updated: string;
  };
  messages: Message[];
  labels: Record<string, string>;
  numeric_labels: Record<string, number>;
  namespace: string;
}

export type ConversationRequestBase = Omit<Conversation, 'user' | 'conversation' | 'namespace'> & {
  conversation: { title: string };
};

export type ConversationCreateRequest = ConversationRequestBase;
export type ConversationUpdateRequest = ConversationRequestBase & { conversation: { id: string } };
