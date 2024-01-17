/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BulkOperationContainer } from '@elastic/elasticsearch/lib/api/types';
import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import {
  ConversationCreateProps,
  ConversationUpdateProps,
  UUID,
} from '../schemas/conversations/common_attributes.gen';
import { transformToCreateScheme } from './create_conversation';
import { transformToUpdateScheme } from './update_conversation';
import { SearchEsConversationSchema } from './types';

interface WriterBulkResponse {
  errors: string[];
  docs_created: string[];
  docs_deleted: string[];
  docs_updated: string[];
  took: number;
}

interface BulkParams {
  conversationsToCreate?: ConversationCreateProps[];
  conversationsToUpdate?: ConversationUpdateProps[];
  conversationsToDelete?: string[];
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
        errors: errors
          ? items
              .map((item) => item.create?.error?.reason)
              .filter((error): error is string => !!error)
          : [],
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
      };
    } catch (e) {
      this.options.logger.error(`Error bulk actions for conversations: ${e.message}`);
      return {
        errors: [`${e.message}`],
        docs_created: [],
        docs_deleted: [],
        docs_updated: [],
        took: 0,
      };
    }
  };

  private buildBulkOperations = async (params: BulkParams): Promise<BulkOperationContainer[]> => {
    const changedAt = new Date().toISOString();
    const conversationBody =
      params.conversationsToCreate?.flatMap((conversation) => [
        { create: { _index: this.options.index, op_type: 'create' } },
        transformToCreateScheme(changedAt, this.options.spaceId, this.options.user, conversation),
      ]) ?? [];

    const conversationUpdatedBody =
      params.conversationsToUpdate?.flatMap((conversation) => [
        { update: { _id: conversation.id, _index: this.options.index } },
        transformToUpdateScheme(changedAt, conversation),
      ]) ?? [];

    const response = params.conversationsToDelete
      ? await this.options.esClient.search<SearchEsConversationSchema>({
          body: {
            query: {
              ids: {
                values: params.conversationsToDelete,
              },
            },
          },
          _source: false,
          ignore_unavailable: true,
          index: this.options.index,
          seq_no_primary_term: true,
          size: 1000,
        })
      : undefined;

    const conversationDeletedBody =
      params.conversationsToDelete?.flatMap((conversationId) => [
        {
          delete: {
            _id: conversationId,
            _index: response?.hits.hits.find((c) => c._id === conversationId)?._index,
          },
        },
      ]) ?? [];

    return [
      ...conversationBody,
      ...conversationUpdatedBody,
      ...conversationDeletedBody,
    ] as BulkOperationContainer[];
  };
}
