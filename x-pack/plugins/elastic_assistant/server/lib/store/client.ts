/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { Conversation } from '@kbn/observability-ai-assistant-plugin/common';
import { notFound } from '@hapi/boom';
import { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import { Logger } from '@kbn/logging';
import { getAccessQuery } from './get_access_query';
import { AIAssistantResourceNames } from './types';

export class AIAssistantStoreClient {
  constructor(
    private readonly dependencies: {
      namespace: string;
      esClient: ElasticsearchClient;
      logger: Logger;
      resources: AIAssistantResourceNames;
      user: {
        id?: string;
        name: string;
      };
    }
  ) {}
  private getConversationWithMetaFields = async (
    conversationId: string
  ): Promise<SearchHit<Conversation> | undefined> => {
    const response = await this.dependencies.esClient.search<Conversation>({
      index: this.dependencies.resources.aliases,
      query: {
        bool: {
          filter: [
            ...getAccessQuery({
              user: this.dependencies.user,
              namespace: this.dependencies.namespace,
            }),
            { term: { 'conversation.id': conversationId } },
          ],
        },
      },
      size: 1,
      terminate_after: 1,
    });

    return response.hits.hits[0];
  };

  get = async (conversationId: string): Promise<Conversation> => {
    const conversation = await this.getConversationWithMetaFields(conversationId);

    if (!conversation) {
      throw notFound();
    }
    return conversation._source!;
  };

  find = async (options?: { query?: string }): Promise<{ conversations: Conversation[] }> => {
    const response = await this.dependencies.esClient.search<Conversation>({
      index: this.dependencies.resources.aliases,
      allow_no_indices: true,
      query: {
        bool: {
          filter: [
            ...getAccessQuery({
              user: this.dependencies.user,
              namespace: this.dependencies.namespace,
            }),
          ],
        },
      },
      size: 100,
    });

    return {
      conversations: response.hits.hits.map((hit) => hit._source!),
    };
  };
}
