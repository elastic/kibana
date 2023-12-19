/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { ElasticsearchClient } from '@kbn/core/server';

import {
  ConversationCreateProps,
  ConversationResponse,
  Replacement,
  UUID,
} from '../schemas/conversations/common_attributes.gen';

export interface CreateMessageSchema {
  '@timestamp'?: string;
  created_at: string;
  title: string;
  id?: string | undefined;
  messages?: Array<{
    '@timestamp': string;
    content: string;
    reader?: string | undefined;
    replacements?: unknown;
    role: 'user' | 'assistant' | 'system';
    is_error?: boolean;
    presentation?: {
      delay?: number;
      stream?: boolean;
    };
    trace_data?: {
      transaction_id?: string;
      trace_id?: string;
    };
  }>;
  api_config?: {
    connector_id?: string;
    connector_type_title?: string;
    default_system_prompt_id?: string;
    provider?: 'OpenAI' | 'Azure OpenAI';
    model?: string;
  };
  is_default?: boolean;
  exclude_from_last_conversation_storage?: boolean;
  replacements?: unknown;
  user?: {
    id?: string;
    name?: string;
  };
  updated_at?: string;
  namespace: string;
}

export const createConversation = async (
  esClient: ElasticsearchClient,
  conversationIndex: string,
  namespace: string,
  user: { id?: UUID; name?: string },
  conversation: ConversationCreateProps
): Promise<ConversationResponse> => {
  const createdAt = new Date().toISOString();
  const body: CreateMessageSchema = transformToCreateScheme(
    createdAt,
    namespace,
    user,
    conversation
  );

  const response = await esClient.create({
    body,
    id: uuidv4(),
    index: conversationIndex,
    refresh: 'wait_for',
  });

  return {
    id: response._id,
    ...transform(body),
  };
};

export const transformToCreateScheme = (
  createdAt: string,
  namespace: string,
  user: { id?: UUID; name?: string },
  {
    title,
    apiConfig,
    excludeFromLastConversationStorage,
    isDefault,
    messages,
    replacements,
  }: ConversationCreateProps
) => {
  return {
    '@timestamp': createdAt,
    created_at: createdAt,
    user,
    title,
    api_config: {
      connector_id: apiConfig?.connectorId,
      connector_type_title: apiConfig?.connectorTypeTitle,
      default_system_prompt_id: apiConfig?.defaultSystemPromptId,
      model: apiConfig?.model,
      provider: apiConfig?.provider,
    },
    exclude_from_last_conversation_storage: excludeFromLastConversationStorage,
    is_default: isDefault,
    messages: messages?.map((message) => ({
      '@timestamp': message.timestamp,
      content: message.content,
      is_error: message.isError,
      presentation: message.presentation,
      reader: message.reader,
      replacements: message.replacements,
      role: message.role,
      trace_data: {
        trace_id: message.traceData?.traceId,
        transaction_id: message.traceData?.transactionId,
      },
    })),
    updated_at: createdAt,
    replacements,
    namespace,
  };
};

function transform(conversationSchema: CreateMessageSchema): ConversationResponse {
  const response: ConversationResponse = {
    id: conversationSchema.id,
    timestamp: conversationSchema['@timestamp'],
    createdAt: conversationSchema.created_at,
    user: conversationSchema.user,
    title: conversationSchema.title,
    apiConfig: {
      connectorId: conversationSchema.api_config?.connector_id,
      connectorTypeTitle: conversationSchema.api_config?.connector_type_title,
      defaultSystemPromptId: conversationSchema.api_config?.default_system_prompt_id,
      model: conversationSchema.api_config?.model,
      provider: conversationSchema.api_config?.provider,
    },
    excludeFromLastConversationStorage: conversationSchema.exclude_from_last_conversation_storage,
    isDefault: conversationSchema.is_default,
    messages: conversationSchema.messages?.map((message) => ({
      timestamp: message['@timestamp'],
      content: message.content,
      isError: message.is_error,
      presentation: message.presentation,
      reader: message.reader,
      replacements: message.replacements as Replacement[],
      role: message.role,
      traceData: {
        traceId: message.trace_data?.trace_id,
        transactionId: message.trace_data?.transaction_id,
      },
    })),
    updatedAt: conversationSchema.updated_at,
    replacements: conversationSchema.replacements as Replacement[],
    namespace: conversationSchema.namespace,
  };
  return response;
}
