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
  getMessageContentWithoutReplacements,
} from '@kbn/elastic-assistant-common';
import { AuthenticatedUser } from '@kbn/security-plugin/common';
import { getConversation } from './get_conversation';

export interface UpdateConversationSchema {
  '@timestamp'?: string;
  title?: string;
  messages?: Array<{
    '@timestamp': string;
    content: string;
    reader?: Reader;
    replacements?: Replacement;
    role: MessageRole;
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
    provider?: Provider;
    model?: string;
  };
  exclude_from_last_conversation_storage?: boolean;
  replacements?: Replacement;
  updated_at?: string;
}

export interface UpdateConversationParams {
  esClient: ElasticsearchClient;
  logger: Logger;
  user?: AuthenticatedUser;
  conversationIndex: string;
  existingConversation: ConversationResponse;
  conversationUpdateProps: ConversationUpdateProps;
  isPatch?: boolean;
}

export const updateConversation = async ({
  esClient,
  logger,
  conversationIndex,
  existingConversation,
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
          values: [existingConversation.id],
        },
      },
      refresh: true,
      script: {
        lang: 'painless',
        params: {
          ...params,
          // when assigning undefined in painless, it will remove property and wil set it to null
          // for patch we don't want to remove unspecified value in payload
          assignEmpty: !(isPatch ?? true),
        },
        source: `
          if (params.assignEmpty == true || params.containsKey('api_config')) {
            if (params.assignEmpty == true || params.api_config.containsKey('connector_id')) {
              ctx._source.api_config.connector_id = params.api_config.connector_id;
            }
            if (params.assignEmpty == true || params.api_config.containsKey('connector_type_title')) {
              ctx._source.api_config.connector_type_title = params.api_config.connector_type_title;
            }
            if (params.assignEmpty == true || params.api_config.containsKey('default_system_prompt_id')) {
              ctx._source.api_config.default_system_prompt_id = params.api_config.default_system_prompt_id;
            }
            if (params.assignEmpty == true || params.api_config.containsKey('model')) {
              ctx._source.api_config.model = params.api_config.model;
            }
            if (params.assignEmpty == true || params.api_config.containsKey('provider')) {
              ctx._source.api_config.provider = params.api_config.provider;
            }
          }
          if (params.assignEmpty == true || params.containsKey('exclude_from_last_conversation_storage')) {
            ctx._source.exclude_from_last_conversation_storage = params.exclude_from_last_conversation_storage;
          }
          if (params.assignEmpty == true || params.containsKey('replacements')) {
            ctx._source.replacements = params.replacements;
          }
          if (params.assignEmpty == true || params.containsKey('title')) {
            ctx._source.title = params.title;
          }
          if (params.assignEmpty == true || params.containsKey('messages')) {
            def messages = [];
            for (message in params.messages) {
              def newMessage = [:];
              newMessage['@timestamp'] = message['@timestamp'];
              newMessage.content = message.content;
              newMessage.is_error = message.is_error;
              newMessage.presentation = message.presentation;
              newMessage.reader = message.reader;
              newMessage.replacements = message.replacements;
              newMessage.role = message.role; 
              messages.add(newMessage);
            }
            ctx._source.messages = messages;
          }
          ctx._source.updated_at = params.updated_at;
        `,
      },
    });

    if (response.failures && response.failures.length > 0) {
      logger.warn(
        `Error updating conversation: ${response.failures.map((f) => f.id)} by ID: ${
          existingConversation.id
        }`
      );
      return null;
    }

    if (!response.updated && response.updated === 0) {
      throw Error('No conversation has been updated');
    }

    const updatedConversation = await getConversation({
      esClient,
      conversationIndex,
      id: existingConversation.id,
      logger,
      user,
    });
    return updatedConversation;
  } catch (err) {
    logger.warn(`Error updating conversation: ${err} by ID: ${existingConversation.id}`);
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
  }: ConversationUpdateProps
): UpdateConversationSchema => {
  return {
    updated_at: updatedAt,
    title,
    api_config: {
      connector_id: apiConfig?.connectorId,
      connector_type_title: apiConfig?.connectorTypeTitle,
      default_system_prompt_id: apiConfig?.defaultSystemPromptId,
      model: apiConfig?.model,
      provider: apiConfig?.provider,
    },
    exclude_from_last_conversation_storage: excludeFromLastConversationStorage,
    replacements,
    messages: messages?.map((message) => ({
      '@timestamp': message.timestamp,
      content: getMessageContentWithoutReplacements({
        messageContent: message.content,
        replacements: replacements as Record<string, string> | undefined,
      }),
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
