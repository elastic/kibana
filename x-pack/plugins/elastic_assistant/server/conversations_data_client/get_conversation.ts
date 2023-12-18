/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { ConversationResponse } from '../schemas/conversations/common_attributes.gen';
import { SearchEsConversationSchema } from './types';
import { transformESToConversations } from './transforms';

export const getConversation = async (
  esClient: ElasticsearchClient,
  conversationIndex: string,
  id: string
): Promise<ConversationResponse | null> => {
  const response = await esClient.search<SearchEsConversationSchema>({
    body: {
      query: {
        term: {
          _id: id,
        },
      },
    },
    _source: false,
    fields: ['*'],
    ignore_unavailable: true,
    index: conversationIndex,
    seq_no_primary_term: true,
  });
  const conversation = transformESToConversations(response);
  return conversation[0] ?? null;
};
