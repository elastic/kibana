/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FromSchema } from 'json-schema-to-ts';
import type { JSONSchema } from 'json-schema-to-ts';
import React from 'react';

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
  confidence: 'low' | 'medium' | 'high';
  is_correction: boolean;
  public: boolean;
  labels: Record<string, string>;
}

export type CompatibleJSONSchema = Exclude<JSONSchema, boolean>;

export interface ContextDefinition {
  name: string;
  description: string;
}

interface FunctionResponse {
  content?: any;
  data?: any;
}

interface FunctionOptions<TParameters extends CompatibleJSONSchema = CompatibleJSONSchema> {
  name: string;
  description: string;
  descriptionForUser: string;
  parameters: TParameters;
  contexts: string[];
}

type RespondFunction<TArguments, TResponse extends FunctionResponse> = (
  options: { arguments: TArguments; messages: Message[] },
  signal: AbortSignal
) => Promise<TResponse>;

type RenderFunction<TArguments, TResponse extends FunctionResponse> = (options: {
  arguments: TArguments;
  response: TResponse;
}) => React.ReactNode;

export interface FunctionDefinition {
  options: FunctionOptions;
  respond: (
    options: { arguments: any; messages: Message[] },
    signal: AbortSignal
  ) => Promise<FunctionResponse>;
  render?: RenderFunction<any, any>;
}

export type RegisterContextDefinition = (options: ContextDefinition) => void;

export type RegisterFunctionDefinition = <
  TParameters extends CompatibleJSONSchema,
  TResponse extends FunctionResponse,
  TArguments = FromSchema<TParameters>
>(
  options: FunctionOptions<TParameters>,
  respond: RespondFunction<TArguments, TResponse>,
  render?: RenderFunction<TArguments, TResponse>
) => void;

export type ContextRegistry = Map<string, ContextDefinition>;
export type FunctionRegistry = Map<string, FunctionDefinition>;
