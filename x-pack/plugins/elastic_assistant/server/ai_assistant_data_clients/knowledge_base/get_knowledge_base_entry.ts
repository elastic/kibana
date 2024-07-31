/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AuthenticatedUser, ElasticsearchClient, Logger } from '@kbn/core/server';
import { KnowledgeBaseEntryResponse } from '@kbn/elastic-assistant-common';
import { EsKnowledgeBaseEntrySchema } from './types';
import { transformESSearchToKnowledgeBaseEntry } from './transforms';

export interface GetKnowledgeBaseEntryParams {
  esClient: ElasticsearchClient;
  logger: Logger;
  knowledgeBaseIndex: string;
  id: string;
  user: AuthenticatedUser;
}

export const getKnowledgeBaseEntry = async ({
  esClient,
  logger,
  knowledgeBaseIndex,
  id,
  user,
}: GetKnowledgeBaseEntryParams): Promise<KnowledgeBaseEntryResponse | null> => {
  const filterByUser = [
    {
      nested: {
        path: 'users',
        query: {
          bool: {
            must: [
              {
                match: user.profile_uid
                  ? { 'users.id': user.profile_uid }
                  : { 'users.name': user.username },
              },
            ],
          },
        },
      },
    },
  ];
  try {
    const response = await esClient.search<EsKnowledgeBaseEntrySchema>({
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
      _source: true,
      ignore_unavailable: true,
      index: knowledgeBaseIndex,
      seq_no_primary_term: true,
    });
    const knowledgeBaseEntry = transformESSearchToKnowledgeBaseEntry(response);
    return knowledgeBaseEntry[0] ?? null;
  } catch (err) {
    logger.error(`Error fetching knowledge base entry: ${err} with id: ${id}`);
    throw err;
  }
};
