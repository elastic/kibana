/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AuthenticatedUser, ElasticsearchClient, Logger } from '@kbn/core/server';
import { ConversationResponse } from '@kbn/elastic-assistant-common';
import { EsConversationSchema } from './types';
import { transformESSearchToConversations } from './transforms';

export interface GetConversationParams {
  esClient: ElasticsearchClient;
  logger: Logger;
  conversationIndex: string;
  id: string;
  user?: AuthenticatedUser | null;
}

export const getConversation = async ({
  esClient,
  logger,
  conversationIndex,
  id,
  user,
}: GetConversationParams): Promise<ConversationResponse | null> => {
  const filterByUser = user
    ? [
        {
          nested: {
            path: 'users',
            query: {
              bool: {
                must: [
                  {
                    match: user.username
                      ? { 'users.name': user.username }
                      : { 'users.id': user.profile_uid },
                  },
                ],
              },
            },
          },
        },
      ]
    : [];
  try {
    const response = await esClient.search<EsConversationSchema>({
      body: {
        query: {
          bool: {
            must: [
              {
                bool: {
                  should: [
                    {
                      term: {
                        _id: id,
                      },
                    },
                  ],
                },
              },
              ...filterByUser,
            ],
          },
        },
      },
      _source: true,
      ignore_unavailable: true,
      index: conversationIndex,
      seq_no_primary_term: true,
    });
    const conversation = transformESSearchToConversations(response);
    return conversation[0] ?? null;
  } catch (err) {
    logger.error(`Error fetching conversation: ${err} with id: ${id}`);
    throw err;
  }
};
