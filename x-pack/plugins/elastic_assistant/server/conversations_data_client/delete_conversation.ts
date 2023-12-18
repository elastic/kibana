/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { waitUntilDocumentIndexed } from '../lib/wait_until_document_indexed';
import { getConversation } from './get_conversation';

export const deleteConversation = async (
  esClient: ElasticsearchClient,
  conversationIndex: string,
  id: string
): Promise<void> => {
  const conversation = await getConversation(esClient, conversationIndex, id);
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
      refresh: false,
    });

    if (response.deleted) {
      const checkIfConversationDeleted = async (): Promise<void> => {
        const deletedConversation = await getConversation(esClient, conversationIndex, id);
        if (deletedConversation !== null) {
          throw Error('Conversation has not been re-indexed in time');
        }
      };

      await waitUntilDocumentIndexed(checkIfConversationDeleted);
    } else {
      throw Error('No conversation has been deleted');
    }
  }
};
