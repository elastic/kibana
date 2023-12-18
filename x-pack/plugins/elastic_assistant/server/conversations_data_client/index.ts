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
import { IIndexPatternString } from '../types';
import { ConversationDataWriter } from './conversations_data_writer';
import { getIndexTemplateAndPattern } from '../ai_assistant_service/lib/conversation_configuration_type';
import { createConversation } from './create_conversation';
import {
  ConversationCreateProps,
  ConversationResponse,
  ConversationUpdateProps,
} from '../schemas/conversations/common_attributes.gen';
import { FindConversationsResponse } from '../schemas/conversations/find_conversations_route.gen';
import { findConversations } from './find_conversations';
import { updateConversation } from './update_conversation';
import { getConversation } from './get_conversation';
import { deleteConversation } from './delete_conversation';

export enum OpenAiProviderType {
  OpenAi = 'OpenAI',
  AzureAi = 'Azure OpenAI',
}

export interface AIAssistantDataClientParams {
  elasticsearchClientPromise: Promise<ElasticsearchClient>;
  kibanaVersion: string;
  namespace: string;
  logger: Logger;
  indexPatternsResorceName: string;
  currentUser: AuthenticatedUser | null;
}

export class AIAssistantDataClient {
  /** Kibana space id the conversation are part of */
  private readonly spaceId: string;

  /** User creating, modifying, deleting, or updating a conversation */
  private readonly currentUser: AuthenticatedUser | null;

  private writerCache: Map<string, ConversationDataWriter> = new Map();

  private indexTemplateAndPattern: IIndexPatternString;

  constructor(private readonly options: AIAssistantDataClientParams) {
    this.indexTemplateAndPattern = getIndexTemplateAndPattern(
      this.options.indexPatternsResorceName,
      this.options.namespace ?? DEFAULT_NAMESPACE_STRING
    );
    this.currentUser = this.options.currentUser;
    this.spaceId = this.options.namespace;
  }

  public async getWriter(): Promise<ConversationDataWriter> {
    const namespace = this.spaceId;
    if (this.writerCache.get(namespace)) {
      return this.writerCache.get(namespace) as ConversationDataWriter;
    }
    const indexPatterns = this.indexTemplateAndPattern;
    await this.initializeWriter(namespace, indexPatterns.alias);
    return this.writerCache.get(namespace) as ConversationDataWriter;
  }

  private async initializeWriter(
    namespace: string,
    index: string
  ): Promise<ConversationDataWriter> {
    const esClient = await this.options.elasticsearchClientPromise;
    const writer = new ConversationDataWriter({
      esClient,
      namespace,
      index,
      logger: this.options.logger,
      user: { id: this.currentUser?.profile_uid, name: this.currentUser?.username },
    });

    this.writerCache.set(namespace, writer);
    return writer;
  }

  public getReader(options: { namespace?: string } = {}) {
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
  }

  public getConversation = async (id: string): Promise<ConversationResponse | null> => {
    const esClient = await this.options.elasticsearchClientPromise;
    return getConversation(esClient, this.indexTemplateAndPattern.alias, id);
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
   * @param options.id The id of the conversat to create or "undefined" if you want an "id" to be auto-created for you
   * @param options.title A custom deserializer for the conversation. Optionally, you an define this as handle bars. See online docs for more information.
   * @param options.messages Set this to true if this is a conversation that is "immutable"/"pre-packaged".
   * @param options.apiConfig Determines how uploaded conversation item values are parsed. By default, conversation items are parsed using named regex groups. See online docs for more information.
   * @returns The conversation created
   */
  public createConversation = async (
    props: ConversationCreateProps
  ): Promise<ConversationResponse> => {
    const { currentUser } = this;
    const esClient = await this.options.elasticsearchClientPromise;
    return createConversation(
      esClient,
      this.indexTemplateAndPattern.alias,
      this.spaceId,
      { id: currentUser?.profile_uid, name: currentUser?.username },
      props
    );
  };

  /**
   * Updates a conversation container's value given the id of the conversation.
   * See {@link https://www.elastic.co/guide/en/elasticsearch/reference/current/optimistic-concurrency-control.html}
   * for more information around optimistic concurrency control.
   * @param options
   * @param options._version This is the version, useful for optimistic concurrency control.
   * @param options.id id of the conversation to replace the conversation container data with.
   * @param options.name The new name, or "undefined" if this should not be updated.
   * @param options.description The new description, or "undefined" if this should not be updated.
   * @param options.meta Additional meta data to associate with the conversation items as an object of "key/value" pairs. You can set this to "undefined" to not update meta values.
   * @param options.version Updates the version of the conversation.
   */
  public updateConversation = async (
    existingConversation: ConversationResponse,
    updatedProps: ConversationUpdateProps,
    isPatch?: boolean
  ): Promise<ConversationResponse | null> => {
    const esClient = await this.options.elasticsearchClientPromise;
    return updateConversation(
      esClient,
      this.indexTemplateAndPattern.alias,
      existingConversation,
      updatedProps,
      isPatch
    );
  };

  /**
   * Given a conversation id, this will delete the conversation from the id
   * @param options
   * @param options.id The id of the conversation to delete
   * @returns The conversation deleted if found, otherwise null
   */
  public deleteConversation = async (id: string): Promise<void> => {
    const esClient = await this.options.elasticsearchClientPromise;
    deleteConversation(esClient, this.indexTemplateAndPattern.alias, id);
  };
}
