/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as Boom from '@hapi/boom';
import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { ChatCompletionRequestMessage } from 'openai';
import { v4 } from 'uuid';
import { i18n } from '@kbn/i18n';
import { CoPilotConversation, CoPilotConversationMessage } from '../../../common/co_pilot';
import { CoPilotResourceNames, IOpenAIClient } from './types';

const MAX_NO_MESSAGES = 100;

export class CoPilotClient {
  private readonly openAiClient: IOpenAIClient;
  private readonly esClient: ElasticsearchClient;
  private readonly resources: CoPilotResourceNames;
  private readonly logger: Logger;

  private readonly user: { id?: string; name: string };

  constructor({
    esClient,
    openAiClient,
    resources,
    user,
    logger,
  }: {
    esClient: ElasticsearchClient;
    openAiClient: IOpenAIClient;
    resources: CoPilotResourceNames;
    user: {
      id?: string;
      name: string;
    };
    logger: Logger;
  }) {
    this.openAiClient = openAiClient;
    this.esClient = esClient;
    this.resources = resources;
    this.user = user;
    this.logger = logger;
  }

  private getUserQuery() {
    return [
      { term: { 'user.name': this.user.name } },
      ...(this.user.id ? [{ term: { 'user.id': this.user.id } }] : []),
    ];
  }

  public async getConversations({ size }: { size: number }) {
    this.logger.debug(`Getting list of conversations`);
    const response = await this.esClient.search<CoPilotConversation>({
      size,
      index: this.resources.indexPatterns.conversations,
      query: {
        bool: {
          filter: [...this.getUserQuery()],
        },
      },
      sort: {
        '@timestamp': 'desc',
      },
    });

    return { conversations: response.hits.hits.map((hit) => hit._source!) };
  }

  public async getConversation({ conversationId }: { conversationId: string }) {
    this.logger.debug(`Fetching conversation (id: ${conversationId}`);

    const [conversationResponse, messagesResponse] = await Promise.all([
      this.esClient.search<CoPilotConversation>({
        terminate_after: 1,
        index: this.resources.indexPatterns.conversations,
        query: {
          bool: {
            filter: [{ term: { 'conversation.id': conversationId } }, ...this.getUserQuery()],
          },
        },
      }),
      this.esClient.search<CoPilotConversationMessage>({
        index: this.resources.indexPatterns.messages,
        size: MAX_NO_MESSAGES,
        query: {
          bool: {
            filter: [{ term: { 'conversation.id': conversationId } }, ...this.getUserQuery()],
          },
        },
        sort: [
          {
            '@timestamp': 'desc',
          },
          {
            'message.order': 'desc',
          },
        ],
      }),
    ]);

    if (!conversationResponse.hits.hits[0]) {
      this.logger.debug(`Conversation not found (id: ${conversationId})`);
      throw Boom.notFound();
    }

    this.logger.debug(`Found conversation (id: ${conversationId})`);

    return {
      conversation: conversationResponse.hits.hits[0]._source!,
      messages: messagesResponse.hits.hits.map((hit) => hit._source!).reverse(),
    };
  }

  public async updateConversation({ conversation }: { conversation: CoPilotConversation }) {
    this.logger.debug(`Updating conversation (id: ${conversation.conversation.id})`);
    const updated: CoPilotConversation = {
      ...conversation,
      conversation: {
        ...conversation.conversation,
        last_updated: new Date().toISOString(),
      },
    };

    const response = await this.esClient.search<CoPilotConversation>({
      query: {
        bool: {
          filter: [{ term: { 'conversation.id': conversation.conversation.id } }],
        },
      },
      size: 1,
      terminate_after: 1,
    });

    const esDocument = response.hits.hits[0];

    if (!esDocument) {
      this.logger.debug(`Did not find conversation (id: ${conversation.conversation.id})`);
      throw Boom.notFound();
    }

    await this.esClient.index({
      index: this.resources.concreteIndices.conversations,
      id: esDocument._id,
      document: updated,
    });

    return { conversation: updated };
  }

  public async createConversation() {
    const conversationId = v4();

    this.logger.debug(`Creating conversation (id: ${conversationId})`);

    const created = new Date().toISOString();

    const conversation: CoPilotConversation = {
      '@timestamp': created,
      conversation: {
        id: conversationId,
        title: i18n.translate('xpack.observability.coPilot.newChatTitle', {
          defaultMessage: 'New chat',
        }),
        last_updated: created,
      },
      labels: {},
      numeric_labels: {},
      user: {
        id: this.user.id,
        name: this.user.name,
      },
    };

    await this.esClient.index({
      index: this.resources.concreteIndices.conversations,
      document: conversation,
      refresh: 'wait_for',
      op_type: 'create',
    });

    return { conversation };
  }

  public async prompt({ messages }: { messages: ChatCompletionRequestMessage[] }) {
    return await this.openAiClient.chatCompletion.create(messages);
  }

  public async append({
    conversationId,
    messages,
  }: {
    conversationId: string;
    messages: ChatCompletionRequestMessage[];
  }) {
    const time = new Date().toISOString();

    this.logger.debug(`Appending to conversation (id: ${conversationId})`);

    const bulkResponse = await this.esClient.bulk({
      index: this.resources.concreteIndices.messages,
      refresh: 'wait_for',
      operations: messages.flatMap((message, index) => {
        const messageDoc: CoPilotConversationMessage = {
          '@timestamp': time,
          labels: {},
          numeric_labels: {},
          conversation: {
            id: conversationId,
          },
          message: {
            content: message.content,
            role: message.role,
            order: index,
          },
          user: {
            id: this.user.id,
            name: this.user.name,
          },
        };
        return [{ create: {} }, messageDoc];
      }),
    });

    this.logger.debug(
      `Received bulk response for append, ${
        bulkResponse.errors ? 'with errors' : 'without errors'
      } (id: ${conversationId})`
    );

    if (bulkResponse.errors) {
      this.logger.debug(JSON.stringify(bulkResponse.items, null, 2));

      const errors = bulkResponse.items.filter((item) => item.index && 'error' in item.index);

      errors.slice(0, 5).forEach((item) => {
        this.logger.debug(`Failed to index:\n ${JSON.stringify(item)}`);
      });

      throw Boom.internal(`Failed to index ${errors.length} item(s)`);
    }

    this.logger.debug(`Successfully indexed messages (id: ${conversationId})`);

    return this.getConversation({
      conversationId,
    });
  }

  public async autoTitleConversation({ conversationId }: { conversationId: string }) {
    const { conversation, messages } = await this.getConversation({ conversationId });

    this.logger.debug(`Getting a title suggestion for conversation (id: ${conversationId})`);

    const indexOfFirstUserMessage = messages.findIndex(
      (message) => message.message.role === 'user'
    );

    const messagesToSuggestTitleFor =
      indexOfFirstUserMessage !== -1 ? messages.slice(0, indexOfFirstUserMessage + 1) : messages;

    const response = await this.openAiClient.chatCompletion.create(
      messagesToSuggestTitleFor
        .map((message) => ({ role: message.message.role, content: message.message.content }))
        .concat({
          role: 'user',
          content: `Suggest a short title for this conversation, without quotes or markup.`,
        }),
      false
    );

    const reply = response.choices[0].message?.content ?? '';

    this.logger.debug(`Suggested title for conversation (id: ${conversationId})`);

    return this.updateConversation({
      conversation: {
        ...conversation,
        conversation: { ...conversation.conversation, title: reply },
      },
    });
  }

  public async chat({ messages }: { messages: ChatCompletionRequestMessage[] }) {
    this.logger.debug(`Getting chat completion`);

    const readable = await this.openAiClient.chatCompletion.create(messages);

    return readable;
  }
}
