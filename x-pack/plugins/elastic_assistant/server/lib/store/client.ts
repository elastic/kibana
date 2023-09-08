/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { notFound } from '@hapi/boom';
import { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import { Logger } from '@kbn/logging';
import { Conversationn, Conversationss } from '../../schemas/conversations';
import { AIAssistantResourceNames } from './types';
import { getAccessQuery } from './get_access_query';

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
  private getConversationById = async (
    conversationId: string
  ): Promise<SearchHit<Conversationn> | undefined> => {
    const response = await this.dependencies.esClient.search<Conversationn>({
      index: this.dependencies.resources.aliases,
      query: {
        bool: {
          filter: [
            ...getAccessQuery({
              user: this.dependencies.user,
            }),
          ],
          must: { match: { id: conversationId } },
        },
      },
      size: 1,
      terminate_after: 1,
    });

    return response.hits.hits[0];
  };

  get = async (conversationId: string): Promise<Conversationn> => {
    const conversation = await this.getConversationById(conversationId);

    if (!conversation || !conversation._source) {
      throw notFound();
    }
    return conversation._source;
  };

  find = async (options?: { query?: string }): Promise<Conversationss> => {
    const response = await this.dependencies.esClient.search<Conversationn>({
      index: this.dependencies.resources.aliases,
      allow_no_indices: true,
      query: {
        bool: {
          filter: [
            ...getAccessQuery({
              user: this.dependencies.user,
            }),
          ],
        },
      },
      size: 100,
    });

    return response.hits.hits.reduce((acc, hit) => {
      if (!hit._source) {
        return acc;
      }
      return {
        ...acc,
        [hit._source.id]: hit._source,
      };
    }, {});
  };

  create = async (conversation: Conversationn): Promise<Conversationn> => {
    await this.dependencies.esClient.index({
      index: this.dependencies.resources.aliases,
      document: conversation,
      refresh: 'wait_for',
    });

    return conversation;
  };

  uniqueCreate = async (conversation: Conversationn): Promise<Conversationn> => {
    const existingConvo = await this.getConversationById(conversation.id);

    if (!existingConvo) {
      console.log('do a create:', conversation.id);
      await this.create(conversation);
    }

    return conversation;
  };

  initializeFromConversationStore = async (
    conversations: Conversationss
  ): Promise<Conversationss> => {
    // TODO fix api
    return conversations;
    const [keys, values] = [Object.keys(conversations), Object.values(conversations)];
    const validatedConversations = await Promise.all(
      values.map((c: Conversationn) =>
        this.uniqueCreate({
          ...c,
          theme: {
            ...(c.theme ?? {}),
            user: {
              ...(c.theme && c.theme.user ? c.theme.user : {}),
              ...this.dependencies.user,
            },
          },
        })
      )
    );
    const conversationStore = keys.reduce(
      (acc, key, i) => ({
        ...acc,
        [key]: validatedConversations[i],
      }),
      {}
    );
    console.log('yes do it bitch', {
      conversationStore,
      conversations,
    });
    return conversationStore;
  };
}
