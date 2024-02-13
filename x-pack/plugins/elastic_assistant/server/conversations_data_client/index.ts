/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from '@kbn/core/server';

import { DEFAULT_NAMESPACE_STRING } from '@kbn/core-saved-objects-utils-server';
import { ESSearchRequest, ESSearchResponse } from '@kbn/es-types';
import { AuthenticatedUser } from '@kbn/security-plugin/server';
import { estypes } from '@elastic/elasticsearch';
import {
  ConversationCreateProps,
  ConversationResponse,
  ConversationUpdateProps,
  FindConversationsResponse,
  Message,
} from '@kbn/elastic-assistant-common';
import { IIndexPatternString } from '../types';
import { ConversationDataWriter } from './conversations_data_writer';
import { createConversation } from './create_conversation';
import { findConversations } from './find_conversations';
import { updateConversation } from './update_conversation';
import { getConversation } from './get_conversation';
import { deleteConversation } from './delete_conversation';
import { appendConversationMessages } from './append_conversation_messages';
import { getIndexTemplateAndPattern } from '../lib/data_client/helper';

export interface AIAssistantConversationsDataClientParams {
  elasticsearchClientPromise: Promise<ElasticsearchClient>;
  kibanaVersion: string;
  spaceId: string;
  logger: Logger;
  indexPatternsResorceName: string;
  currentUser: AuthenticatedUser | null;
}

export class AIAssistantConversationsDataClient {
  /** Kibana space id the conversation are part of */
  private readonly spaceId: string;

  /** User creating, modifying, deleting, or updating a conversation */
  private readonly currentUser: AuthenticatedUser | null;

  private writerCache: Map<string, ConversationDataWriter> = new Map();

  private indexTemplateAndPattern: IIndexPatternString;

  constructor(private readonly options: AIAssistantConversationsDataClientParams) {
    this.indexTemplateAndPattern = getIndexTemplateAndPattern(
      this.options.indexPatternsResorceName,
      this.options.spaceId ?? DEFAULT_NAMESPACE_STRING
    );
    this.currentUser = this.options.currentUser;
    this.spaceId = this.options.spaceId;
  }

  public getWriter = async (): Promise<ConversationDataWriter> => {
    const spaceId = this.spaceId;
    if (this.writerCache.get(spaceId)) {
      return this.writerCache.get(spaceId) as ConversationDataWriter;
    }
    await this.initializeWriter(spaceId, this.indexTemplateAndPattern.alias);
    return this.writerCache.get(spaceId) as ConversationDataWriter;
  };

  private async initializeWriter(spaceId: string, index: string): Promise<ConversationDataWriter> {
    const esClient = await this.options.elasticsearchClientPromise;
    const writer = new ConversationDataWriter({
      esClient,
      spaceId,
      index,
      logger: this.options.logger,
      user: { id: this.currentUser?.profile_uid, name: this.currentUser?.username },
    });

    this.writerCache.set(spaceId, writer);
    return writer;
  }

  public getReader = async (options: { spaceId?: string } = {}) => {
    const indexPatterns = this.indexTemplateAndPattern.alias;

    return {
      search: async <
        TSearchRequest extends ESSearchRequest,
        TConversationDoc = Partial<ConversationResponse>
      >(
        request: TSearchRequest
      ): Promise<ESSearchResponse<TConversationDoc, TSearchRequest>> => {
        try {
          const esClient = await this.options.elasticsearchClientPromise;
          return (await esClient.search({
            ...request,
            index: indexPatterns,
            ignore_unavailable: true,
            seq_no_primary_term: true,
          })) as unknown as ESSearchResponse<TConversationDoc, TSearchRequest>;
        } catch (err) {
          this.options.logger.error(
            `Error performing search in AIAssistantDataClient - ${err.message}`
          );
          throw err;
        }
      },
    };
  };

  public getConversation = async ({
    id,
    authenticatedUser,
  }: {
    id: string;
    authenticatedUser?: AuthenticatedUser | null;
  }): Promise<ConversationResponse | null> => {
    const esClient = await this.options.elasticsearchClientPromise;
    return getConversation({
      esClient,
      logger: this.options.logger,
      conversationIndex: this.indexTemplateAndPattern.alias,
      id,
      user: authenticatedUser,
    });
  };

  /**
   * Updates a conversation with the new messages.
   * @param options
   * @param options.conversation The existing conversation to which append the new messages.
   * @param options.messages Set this to true if this is a conversation that is "immutable"/"pre-packaged".
   * @returns The conversation updated
   */
  public appendConversationMessages = async ({
    existingConversation,
    messages,
  }: {
    existingConversation: ConversationResponse;
    messages: Message[];
  }): Promise<ConversationResponse | null> => {
    const esClient = await this.options.elasticsearchClientPromise;
    return appendConversationMessages({
      esClient,
      logger: this.options.logger,
      conversationIndex: this.indexTemplateAndPattern.alias,
      existingConversation,
      messages,
    });
  };

  public findConversations = async ({
    perPage,
    page,
    sortField,
    sortOrder,
    filter,
    fields,
  }: {
    perPage: number;
    page: number;
    sortField?: string;
    sortOrder?: string;
    filter?: string;
    fields?: string[];
  }): Promise<FindConversationsResponse> => {
    const esClient = await this.options.elasticsearchClientPromise;
    return findConversations({
      esClient,
      fields,
      page,
      perPage,
      filter,
      sortField,
      conversationIndex: this.indexTemplateAndPattern.alias,
      sortOrder: sortOrder as estypes.SortOrder,
    });
  };

  /**
   * Creates a conversation, if given at least the "title" and "apiConfig"
   * See {@link https://www.elastic.co/guide/en/security/current/}
   * for more information around formats of the deserializer and serializer
   * @param options
   * @param options.id The id of the conversation to create or "undefined" if you want an "id" to be auto-created for you
   * @param options.title A custom deserializer for the conversation. Optionally, you an define this as handle bars. See online docs for more information.
   * @param options.messages Set this to true if this is a conversation that is "immutable"/"pre-packaged".
   * @param options.apiConfig Determines how uploaded conversation item values are parsed. By default, conversation items are parsed using named regex groups. See online docs for more information.
   * @returns The conversation created
   */
  public createConversation = async ({
    conversation,
    authenticatedUser,
  }: {
    conversation: ConversationCreateProps;
    authenticatedUser: AuthenticatedUser;
  }): Promise<ConversationResponse | null> => {
    const esClient = await this.options.elasticsearchClientPromise;
    return createConversation({
      esClient,
      logger: this.options.logger,
      conversationIndex: this.indexTemplateAndPattern.alias,
      spaceId: this.spaceId,
      user: authenticatedUser,
      conversation,
    });
  };

  /**
   * Updates a conversation container's value given the id of the conversation.
   * See {@link https://www.elastic.co/guide/en/elasticsearch/reference/current/optimistic-concurrency-control.html}
   * for more information around optimistic concurrency control.
   * @param options
   * @param options.conversationUpdateProps
   * @param options.id id of the conversation to replace the conversation container data with.
   * @param options.title The new tilet, or "undefined" if this should not be updated.
   * @param options.messages The new messages, or "undefined" if this should not be updated.
   * @param options.excludeFromLastConversationStorage The new value for excludeFromLastConversationStorage, or "undefined" if this should not be updated.
   * @param options.replacements The new value for replacements, or "undefined" if this should not be updated.
   */
  public updateConversation = async ({
    existingConversation,
    conversationUpdateProps,
    authenticatedUser,
    isPatch,
  }: {
    existingConversation: ConversationResponse;
    conversationUpdateProps: ConversationUpdateProps;
    authenticatedUser?: AuthenticatedUser;
    isPatch?: boolean;
  }): Promise<ConversationResponse | null> => {
    const esClient = await this.options.elasticsearchClientPromise;
    return updateConversation({
      esClient,
      logger: this.options.logger,
      conversationIndex: this.indexTemplateAndPattern.alias,
      existingConversation,
      conversationUpdateProps,
      isPatch,
      user: authenticatedUser,
    });
  };

  /**
   * Given a conversation id, this will delete the conversation from the id
   * @param options
   * @param options.id The id of the conversation to delete
   * @returns The conversation deleted if found, otherwise null
   */
  public deleteConversation = async (id: string) => {
    const esClient = await this.options.elasticsearchClientPromise;
    return deleteConversation({
      esClient,
      conversationIndex: this.indexTemplateAndPattern.alias,
      id,
      logger: this.options.logger,
    });
  };
}
