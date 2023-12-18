/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';
import { SearchEsConversationSchema } from './types';
import { ConversationResponse, Replacement } from '../schemas/conversations/common_attributes.gen';

export const transformESToConversations = (
  response: estypes.SearchResponse<SearchEsConversationSchema>
): ConversationResponse[] => {
  return response.hits.hits.map((hit) => {
    const conversationSchema = hit.fields;
    const conversation: ConversationResponse = {
      timestamp: conversationSchema?.['@timestamp']?.[0],
      createdAt: conversationSchema?.created_at?.[0],
      user: {
        id: conversationSchema?.['user.id']?.[0],
        name: conversationSchema?.['user.name']?.[0],
      },
      title: conversationSchema?.title?.[0],
      apiConfig: {
        connectorId: conversationSchema?.['api_config.connector_id']?.[0],
        connectorTypeTitle: conversationSchema?.['api_config.connector_type_title']?.[0],
        defaultSystemPromptId: conversationSchema?.['api_config.default_system_prompt_id']?.[0],
        model: conversationSchema?.['api_config.model']?.[0],
        provider: conversationSchema?.['api_config.provider']?.[0],
      },
      excludeFromLastConversationStorage:
        conversationSchema?.exclude_from_last_conversation_storage?.[0],
      isDefault: conversationSchema?.is_default?.[0],
      messages:
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        conversationSchema?.messages?.map((message: Record<string, any>) => ({
          timestamp: message['@timestamp'],
          content: message.content,
          isError: message.is_error,
          presentation: message.presentation,
          reader: message.reader,
          replacements: message.replacements as Replacement[],
          role: message.role,
          traceData: {
            traceId: message?.['trace_data.trace_id'],
            transactionId: message?.['trace_data.transaction_id'],
          },
        })) ?? [],
      updatedAt: conversationSchema?.updated_at?.[0],
      replacements: conversationSchema?.replacements?.[0] as Replacement[],
      namespace: conversationSchema?.namespace?.[0],
      id: hit._id,
    };

    return conversation;
  });
};

export const encodeHitVersion = <T>(hit: T): string | undefined => {
  // Have to do this "as cast" here as these two types aren't included in the SearchResponse hit type
  const { _seq_no: seqNo, _primary_term: primaryTerm } = hit as unknown as {
    _seq_no: number;
    _primary_term: number;
  };

  if (seqNo == null || primaryTerm == null) {
    return undefined;
  } else {
    return Buffer.from(JSON.stringify([seqNo, primaryTerm]), 'utf8').toString('base64');
  }
};
