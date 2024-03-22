/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from '@kbn/core/server';
import {
  ConversationResponse,
  Replacement,
  Reader,
  ConversationUpdateProps,
  Provider,
  MessageRole,
  ConversationSummary,
  UUID,
} from '@kbn/elastic-assistant-common';
import { AuthenticatedUser } from '@kbn/security-plugin/common';
import { getConversation } from './get_conversation';
import { getUpdateScript } from './helpers';

export interface UpdateConversationSchema {
  id: UUID;
  '@timestamp'?: string;
  title?: string;
  messages?: Array<{
    '@timestamp': string;
    content: string;
    reader?: Reader;
    role: MessageRole;
    is_error?: boolean;
    trace_data?: {
      transaction_id?: string;
      trace_id?: string;
    };
  }>;
  api_config?: {
    connector_id?: string;
    default_system_prompt_id?: string;
    provider?: Provider;
    model?: string;
  };
  summary?: ConversationSummary;
  exclude_from_last_conversation_storage?: boolean;
  replacements?: Replacement[];
  updated_at?: string;
}

export interface UpdateConversationParams {
  esClient: ElasticsearchClient;
  logger: Logger;
  user?: AuthenticatedUser;
  conversationIndex: string;
  conversationUpdateProps: ConversationUpdateProps;
  isPatch?: boolean;
}

export const updateConversation = async ({
  esClient,
  logger,
  conversationIndex,
  conversationUpdateProps,
  isPatch,
  user,
}: UpdateConversationParams): Promise<ConversationResponse | null> => {
  const updatedAt = new Date().toISOString();
  const params = transformToUpdateScheme(updatedAt, conversationUpdateProps);
  try {
    const response = await esClient.updateByQuery({
      conflicts: 'proceed',
      index: conversationIndex,
      query: {
        ids: {
          values: [params.id],
        },
      },
      refresh: true,
      script: getUpdateScript({ conversation: params, isPatch }),
    });

    if (response.failures && response.failures.length > 0) {
      logger.warn(
        `Error updating conversation: ${response.failures.map((f) => f.id)} by ID: ${params.id}`
      );
      return null;
    }

    const updatedConversation = await getConversation({
      esClient,
      conversationIndex,
      id: params.id,
      logger,
      user,
    });
    return updatedConversation;
  } catch (err) {
    logger.warn(`Error updating conversation: ${err} by ID: ${params.id}`);
    throw err;
  }
};

export const transformToUpdateScheme = (
  updatedAt: string,
  {
    title,
    apiConfig,
    excludeFromLastConversationStorage,
    messages,
    replacements,
    id,
  }: ConversationUpdateProps
): UpdateConversationSchema => {
  return {
    id,
    updated_at: updatedAt,
    title,
    api_config: {
      connector_id: apiConfig?.connectorId,
      default_system_prompt_id: apiConfig?.defaultSystemPromptId,
      model: apiConfig?.model,
      provider: apiConfig?.provider,
    },
    exclude_from_last_conversation_storage: excludeFromLastConversationStorage,
    replacements,
    messages: messages?.map((message) => ({
      '@timestamp': message.timestamp,
      content: message.content,
      is_error: message.isError,
      reader: message.reader,
      role: message.role,
      trace_data: {
        trace_id: message.traceData?.traceId,
        transaction_id: message.traceData?.transactionId,
      },
    })),
  };
};
