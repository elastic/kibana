/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { JSONSchema } from 'json-schema-to-ts';
import type OpenAI from 'openai';
import type { Observable } from 'rxjs';
import { ChatCompletionChunkEvent, MessageAddEvent } from './conversation_complete';

export type CreateChatCompletionResponseChunk = Omit<OpenAI.ChatCompletionChunk, 'choices'> & {
  choices: Array<
    Omit<OpenAI.ChatCompletionChunk.Choice, 'message'> & {
      delta: { content?: string; function_call?: { name?: string; arguments?: string } };
    }
  >;
};

export enum MessageRole {
  System = 'system',
  Assistant = 'assistant',
  User = 'user',
  Function = 'function',
  Elastic = 'elastic',
}

export enum KnowledgeBaseEntryRole {
  AssistantSummarization = 'assistant_summarization',
  UserEntry = 'user_entry',
  Elastic = 'elastic',
}

export interface PendingMessage {
  message: Message['message'];
  aborted?: boolean;
  error?: any;
}

export interface Message {
  '@timestamp': string;
  message: {
    content?: string;
    name?: string;
    role: MessageRole;
    function_call?: {
      name: string;
      arguments?: string;
      trigger: MessageRole.Assistant | MessageRole.User | MessageRole.Elastic;
    };
    data?: string;
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
  public: boolean;
}

export type ConversationRequestBase = Omit<Conversation, 'user' | 'conversation' | 'namespace'> & {
  conversation: { title: string };
};

export type ConversationCreateRequest = ConversationRequestBase;
export type ConversationUpdateRequest = ConversationRequestBase & { conversation: { id: string } };

export interface KnowledgeBaseEntry {
  '@timestamp': string;
  id: string;
  text: string;
  doc_id: string;
  confidence: 'low' | 'medium' | 'high';
  is_correction: boolean;
  public: boolean;
  labels: Record<string, string>;
  role: KnowledgeBaseEntryRole;
}

export type CompatibleJSONSchema = Exclude<JSONSchema, boolean>;

export interface ContextDefinition {
  name: string;
  description: string;
}

export type FunctionResponse =
  | {
      content?: any;
      data?: any;
    }
  | Observable<ChatCompletionChunkEvent | MessageAddEvent>;

export enum FunctionVisibility {
  System = 'system',
  User = 'user',
  All = 'all',
}

export interface FunctionDefinition<
  TParameters extends CompatibleJSONSchema = CompatibleJSONSchema
> {
  name: string;
  description: string;
  visibility?: FunctionVisibility;
  descriptionForUser?: string;
  parameters: TParameters;
  contexts: string[];
}

export type RegisterContextDefinition = (options: ContextDefinition) => void;

export type ContextRegistry = Map<string, ContextDefinition>;
export type FunctionRegistry = Map<string, FunctionDefinition>;
