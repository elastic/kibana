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
    const conversationSchema = hit._source;
    const conversation: ConversationResponse = {
      timestamp: conversationSchema?.['@timestamp'],
      createdAt: conversationSchema?.created_at,
      user: {
        id: conversationSchema?.user?.id,
        name: conversationSchema?.user?.name,
      },
      title: conversationSchema?.title,
      apiConfig: {
        connectorId: conversationSchema?.api_config?.connector_id,
        connectorTypeTitle: conversationSchema?.api_config?.connector_type_title,
        defaultSystemPromptId: conversationSchema?.api_config?.default_system_prompt_id,
        model: conversationSchema?.api_config?.model,
        provider: conversationSchema?.api_config?.provider,
      },
      excludeFromLastConversationStorage:
        conversationSchema?.exclude_from_last_conversation_storage,
      isDefault: conversationSchema?.is_default,
      messages:
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        conversationSchema?.messages?.map((message: Record<string, any>) => ({
          timestamp: message['@timestamp'],
          content: message.content,
          ...(message.is_error ? { isError: message.is_error } : {}),
          ...(message.presentation ? { presentation: message.presentation } : {}),
          ...(message.reader ? { reader: message.reader } : {}),
          ...(message.replacements ? { replacements: message.replacements as Replacement[] } : {}),
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
      updatedAt: conversationSchema?.updated_at,
      replacements: conversationSchema?.replacements as Replacement[],
      namespace: conversationSchema?.namespace,
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
