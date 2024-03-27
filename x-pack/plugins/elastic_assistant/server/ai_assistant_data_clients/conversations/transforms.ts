/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';
import {
  ConversationResponse,
  Replacement,
  replaceOriginalValuesWithUuidValues,
} from '@kbn/elastic-assistant-common';
import { SearchEsConversationSchema } from './types';

export const transformESToConversations = (
  response: estypes.SearchResponse<SearchEsConversationSchema>
): ConversationResponse[] => {
  return response.hits.hits
    .filter((hit) => hit._source !== undefined)
    .map((hit) => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const conversationSchema = hit._source!;
      const conversation: ConversationResponse = {
        timestamp: conversationSchema['@timestamp'],
        createdAt: conversationSchema.created_at,
        users:
          conversationSchema.users?.map((user) => ({
            id: user.id,
            name: user.name,
          })) ?? [],
        title: conversationSchema.title,
        category: conversationSchema.category,
        summary: conversationSchema.summary,
        ...(conversationSchema.api_config
          ? {
              apiConfig: {
                connectorId: conversationSchema.api_config.connector_id,
                defaultSystemPromptId: conversationSchema.api_config.default_system_prompt_id,
                model: conversationSchema.api_config.model,
                provider: conversationSchema.api_config.provider,
              },
            }
          : {}),
        excludeFromLastConversationStorage:
          conversationSchema.exclude_from_last_conversation_storage,
        isDefault: conversationSchema.is_default,
        messages:
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          conversationSchema.messages?.map((message: Record<string, any>) => ({
            timestamp: message['@timestamp'],
            // always return anonymized data from the client
            content: replaceOriginalValuesWithUuidValues({
              messageContent: message.content,
              replacements: conversationSchema.replacements ?? [],
            }),
            ...(message.is_error ? { isError: message.is_error } : {}),
            ...(message.reader ? { reader: message.reader } : {}),
            role: message.role,
            ...(message.trace_data
              ? {
                  traceData: {
                    traceId: message.trace_data?.trace_id,
                    transactionId: message.trace_data?.transaction_id,
                  },
                }
              : {}),
          })) ?? [],
        updatedAt: conversationSchema.updated_at,
        replacements: conversationSchema.replacements as Replacement[],
        namespace: conversationSchema.namespace,
        id: hit._id,
      };

      return conversation;
    });
};
