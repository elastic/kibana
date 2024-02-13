/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidV4 } from 'uuid';
import type {
  BulkOperationContainer,
  BulkOperationType,
  BulkResponseItem,
} from '@elastic/elasticsearch/lib/api/types';
import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import {
  ConversationCreateProps,
  ConversationUpdateProps,
  UUID,
} from '@kbn/elastic-assistant-common';
import { AuthenticatedUser } from '@kbn/security-plugin-types-common';
import { transformToCreateScheme } from './create_conversation';
import { transformToUpdateScheme } from './update_conversation';
import { SearchEsConversationSchema } from './types';

export interface BulkOperationError {
  message: string;
  status?: number;
  conversation: {
    id: string;
  };
}

interface WriterBulkResponse {
  errors: BulkOperationError[];
  docs_created: string[];
  docs_deleted: string[];
  docs_updated: string[];
  took: number;
}

interface BulkParams {
  conversationsToCreate?: ConversationCreateProps[];
  conversationsToUpdate?: ConversationUpdateProps[];
  conversationsToDelete?: string[];
  isPatch?: boolean;
  authenticatedUser?: AuthenticatedUser;
}

export interface ConversationDataWriter {
  bulk: (params: BulkParams) => Promise<WriterBulkResponse>;
}

interface ConversationDataWriterOptions {
  esClient: ElasticsearchClient;
  index: string;
  spaceId: string;
  user: { id?: UUID; name?: string };
  logger: Logger;
}

export class ConversationDataWriter implements ConversationDataWriter {
  constructor(private readonly options: ConversationDataWriterOptions) {}

  public bulk = async (params: BulkParams) => {
    try {
      if (
        !params.conversationsToCreate?.length &&
        !params.conversationsToUpdate?.length &&
        !params.conversationsToDelete?.length
      ) {
        return { errors: [], docs_created: [], docs_deleted: [], docs_updated: [], took: 0 };
      }

      const { errors, items, took } = await this.options.esClient.bulk({
        refresh: 'wait_for',
        body: await this.buildBulkOperations(params),
      });

      return {
        errors: errors ? this.formatErrorsResponse(items) : [],
        docs_created: items
          .filter((item) => item.create?.status === 201 || item.create?.status === 200)
          .map((item) => item.create?._id ?? ''),
        docs_deleted: items
          .filter((item) => item.delete?.status === 201 || item.delete?.status === 200)
          .map((item) => item.delete?._id ?? ''),
        docs_updated: items
          .filter((item) => item.update?.status === 201 || item.update?.status === 200)
          .map((item) => item.update?._id ?? ''),
        took,
      } as WriterBulkResponse;
    } catch (e) {
      this.options.logger.error(`Error bulk actions for conversations: ${e.message}`);
      return {
        errors: [
          {
            message: e.message,
            conversation: {
              id: '',
            },
          },
        ],
        docs_created: [],
        docs_deleted: [],
        docs_updated: [],
        took: 0,
      } as WriterBulkResponse;
    }
  };

  private getUpdateConversationsQuery = async (
    conversationsToUpdate: ConversationUpdateProps[],
    authenticatedUser?: AuthenticatedUser,
    isPatch?: boolean
  ) => {
    const updatedAt = new Date().toISOString();
    const filterByUser = authenticatedUser
      ? [
          {
            nested: {
              path: 'users',
              query: {
                bool: {
                  must: [
                    {
                      match: authenticatedUser.profile_uid
                        ? { 'users.id': authenticatedUser.profile_uid }
                        : { 'users.name': authenticatedUser.username },
                    },
                  ],
                },
              },
            },
          },
        ]
      : [];

    const responseToUpdate = await this.options.esClient.search<SearchEsConversationSchema>({
      body: {
        query: {
          bool: {
            must: [
              {
                bool: {
                  should: [
                    {
                      ids: {
                        values: conversationsToUpdate?.map((c) => c.id),
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
      _source: false,
      ignore_unavailable: true,
      index: this.options.index,
      seq_no_primary_term: true,
      size: 1000,
    });

    const availableConversationsToUpdate = conversationsToUpdate.filter((c) =>
      responseToUpdate?.hits.hits.find((ac) => ac._id === c.id)
    );

    return availableConversationsToUpdate.flatMap((conversation) => [
      {
        update: {
          _id: conversation.id,
          _index: responseToUpdate?.hits.hits.find((c) => c._id === conversation.id)?._index,
        },
      },
      {
        script: {
          source: `
          if (params.assignEmpty == true || params.containsKey('api_config')) {
            if (params.assignEmpty == true || params.api_config.containsKey('connector_id')) {
              ctx._source.api_config.connector_id = params.api_config.connector_id;
            }
            if (params.assignEmpty == true || params.api_config.containsKey('connector_type_title')) {
              ctx._source.api_config.connector_type_title = params.api_config.connector_type_title;
            }
            if (params.assignEmpty == true || params.api_config.containsKey('default_system_prompt_id')) {
              ctx._source.api_config.default_system_prompt_id = params.api_config.default_system_prompt_id;
            }
            if (params.assignEmpty == true || params.api_config.containsKey('model')) {
              ctx._source.api_config.model = params.api_config.model;
            }
            if (params.assignEmpty == true || params.api_config.containsKey('provider')) {
              ctx._source.api_config.provider = params.api_config.provider;
            }
          }
          if (params.assignEmpty == true || params.containsKey('exclude_from_last_conversation_storage')) {
            ctx._source.exclude_from_last_conversation_storage = params.exclude_from_last_conversation_storage;
          }
          if (params.assignEmpty == true || params.containsKey('replacements')) {
            ctx._source.replacements = params.replacements;
          }
          if (params.assignEmpty == true || params.containsKey('title')) {
            ctx._source.title = params.title;
          }
          if (params.assignEmpty == true || params.containsKey('messages')) {
            def messages = [];
            for (message in params.messages) {
              def newMessage = [:];
              newMessage['@timestamp'] = message['@timestamp'];
              newMessage.content = message.content;
              newMessage.is_error = message.is_error;
              newMessage.presentation = message.presentation;
              newMessage.reader = message.reader;
              newMessage.replacements = message.replacements;
              newMessage.role = message.role; 
              messages.add(newMessage);
            }
            ctx._source.messages = messages;
          }
          ctx._source.updated_at = params.updated_at;
        `,
          lang: 'painless',
          params: {
            ...transformToUpdateScheme(updatedAt, conversation), // when assigning undefined in painless, it will remove property and wil set it to null
            // for patch we don't want to remove unspecified value in payload
            assignEmpty: !(isPatch ?? true),
          },
        },
        upsert: { counter: 1 },
      },
    ]);
  };

  private getDeleteConversationsQuery = async (
    conversationsToDelete: string[],
    authenticatedUser?: AuthenticatedUser
  ) => {
    const filterByUser = authenticatedUser
      ? [
          {
            bool: {
              should: [
                {
                  term: authenticatedUser.profile_uid
                    ? {
                        'user.id': { value: authenticatedUser.profile_uid },
                      }
                    : {
                        'user.name': { value: authenticatedUser.username },
                      },
                },
              ],
            },
          },
        ]
      : [];

    const responseToDelete = await this.options.esClient.search<SearchEsConversationSchema>({
      body: {
        query: {
          bool: {
            must: [
              {
                bool: {
                  should: [
                    {
                      ids: {
                        values: conversationsToDelete,
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
      _source: false,
      ignore_unavailable: true,
      index: this.options.index,
      seq_no_primary_term: true,
      size: 1000,
    });

    return (
      responseToDelete?.hits.hits.map((c) => [
        {
          delete: {
            _id: c._id,
            _index: c._index,
          },
        },
      ]) ?? []
    );
  };

  private buildBulkOperations = async (params: BulkParams): Promise<BulkOperationContainer[]> => {
    const changedAt = new Date().toISOString();
    const conversationCreateBody =
      params.authenticatedUser && params.conversationsToCreate
        ? params.conversationsToCreate.flatMap((conversation) => [
            { create: { _index: this.options.index, _id: uuidV4() } },
            transformToCreateScheme(
              changedAt,
              this.options.spaceId,
              params.authenticatedUser as AuthenticatedUser,
              conversation
            ),
          ])
        : [];

    const conversationDeletedBody =
      params.conversationsToDelete && params.conversationsToDelete.length > 0
        ? await this.getDeleteConversationsQuery(
            params.conversationsToDelete,
            params.authenticatedUser
          )
        : [];

    const conversationUpdatedBody =
      params.conversationsToUpdate && params.conversationsToUpdate.length > 0
        ? await this.getUpdateConversationsQuery(
            params.conversationsToUpdate,
            params.authenticatedUser
          )
        : [];

    return [
      ...conversationCreateBody,
      ...conversationUpdatedBody,
      ...conversationDeletedBody,
    ] as BulkOperationContainer[];
  };

  private formatErrorsResponse = (
    items: Array<Partial<Record<BulkOperationType, BulkResponseItem>>>
  ) => {
    return items
      .map((item) =>
        item.create?.error
          ? {
              message: item.create.error?.reason,
              status: item.create.status,
              conversation: {
                id: item.create._id,
              },
            }
          : item.update?.error
          ? {
              message: item.update.error?.reason,
              status: item.update.status,
              conversation: {
                id: item.update._id,
              },
            }
          : item.delete?.error
          ? {
              message: item.delete?.error?.reason,
              status: item.delete?.status,
              conversation: {
                id: item.delete?._id,
              },
            }
          : undefined
      )
      .filter((e) => e !== undefined);
  };
}
