/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { getConversation } from './get_conversation';
import { UUID } from '../schemas/conversations/common_attributes.gen';

export interface DeleteConversationParams {
  esClient: ElasticsearchClient;
  conversationIndex: string;
  id: string;
  logger: Logger;
  user: { id?: UUID; name?: string };
}
export const deleteConversation = async ({
  esClient,
  conversationIndex,
  id,
  logger,
  user,
}: DeleteConversationParams): Promise<string | null> => {
  const conversation = await getConversation({ esClient, conversationIndex, id, logger, user });
  if (conversation !== null) {
    const response = await esClient.deleteByQuery({
      body: {
        query: {
          ids: {
            values: [id],
          },
        },
      },
      conflicts: 'proceed',
      index: conversationIndex,
      refresh: true,
    });

    if (!response.deleted && response.deleted === 0) {
      throw Error('No conversation has been deleted');
    }
    return conversation.id ?? null;
  }
  return null;
};
