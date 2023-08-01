/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import { internal, notFound } from '@hapi/boom';
import type { ActionsClient } from '@kbn/actions-plugin/server/actions_client';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { OpenAiProviderType } from '@kbn/stack-connectors-plugin/common/gen_ai/constants';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { IncomingMessage } from 'http';
import { compact, isEmpty, merge, omit } from 'lodash';
import type {
  ChatCompletionFunctions,
  ChatCompletionRequestMessage,
  CreateChatCompletionRequest,
} from 'openai';
import { v4 } from 'uuid';
import {
  type FunctionDefinition,
  MessageRole,
  type Conversation,
  type ConversationCreateRequest,
  type ConversationUpdateRequest,
  type Message,
} from '../../../common/types';
import type {
  IObservabilityAIAssistantClient,
  ObservabilityAIAssistantResourceNames,
} from '../types';

export class ObservabilityAIAssistantClient implements IObservabilityAIAssistantClient {
  constructor(
    private readonly dependencies: {
      actionsClient: PublicMethodsOf<ActionsClient>;
      namespace: string;
      esClient: ElasticsearchClient;
      resources: ObservabilityAIAssistantResourceNames;
      logger: Logger;
      user: {
        id?: string;
        name: string;
      };
    }
  ) {}

  private getAccessQuery() {
    return [
      {
        bool: {
          filter: [
            {
              term: {
                'user.name': this.dependencies.user.name,
              },
            },
            {
              term: {
                namespace: this.dependencies.namespace,
              },
            },
          ],
        },
      },
    ];
  }

  private getConversationWithMetaFields = async (
    conversationId: string
  ): Promise<SearchHit<Conversation> | undefined> => {
    const response = await this.dependencies.esClient.search<Conversation>({
      index: this.dependencies.resources.aliases.conversations,
      query: {
        bool: {
          filter: [...this.getAccessQuery(), { term: { 'conversation.id': conversationId } }],
        },
      },
      size: 1,
      terminate_after: 1,
    });

    return response.hits.hits[0];
  };

  private getConversationUpdateValues = (now: string) => {
    return {
      conversation: {
        last_updated: now,
      },
      user: this.dependencies.user,
      namespace: this.dependencies.namespace,
    };
  };

  get = async (conversationId: string): Promise<Conversation | undefined> => {
    return (await this.getConversationWithMetaFields(conversationId))?._source;
  };

  delete = async (conversationId: string): Promise<void> => {
    const conversation = await this.getConversationWithMetaFields(conversationId);

    if (!conversation) {
      throw notFound();
    }

    await this.dependencies.esClient.delete({
      id: conversation._id,
      index: conversation._index,
    });
  };

  chat = async ({
    messages,
    connectorId,
    functions,
  }: {
    messages: Message[];
    connectorId: string;
    functions: Array<FunctionDefinition['options']>;
  }): Promise<IncomingMessage> => {
    const messagesForOpenAI: ChatCompletionRequestMessage[] = compact(
      messages
        .filter((message) => message.message.content || message.message.function_call?.name)
        .map((message) => {
          const role =
            message.message.role === MessageRole.Elastic ? MessageRole.User : message.message.role;

          return {
            role,
            content: message.message.content,
            function_call: isEmpty(message.message.function_call?.name)
              ? undefined
              : omit(message.message.function_call, 'trigger'),
            name: message.message.name,
          };
        })
    );

    const functionsForOpenAI: ChatCompletionFunctions[] = functions.map((fn) =>
      omit(fn, 'contexts')
    );

    const connector = await this.dependencies.actionsClient.get({
      id: connectorId,
    });

    const request: Omit<CreateChatCompletionRequest, 'model'> & { model?: string } = {
      ...(connector.config?.apiProvider === OpenAiProviderType.OpenAi ? { model: 'gpt-4' } : {}),
      messages: messagesForOpenAI,
      stream: true,
      functions: functionsForOpenAI,
      temperature: 0.1,
    };

    const executeResult = await this.dependencies.actionsClient.execute({
      actionId: connectorId,
      params: {
        subAction: 'stream',
        subActionParams: {
          body: JSON.stringify(request),
          stream: true,
        },
      },
    });

    if (executeResult.status === 'error') {
      throw internal(`${executeResult?.message} - ${executeResult?.serviceMessage}`);
    }

    return executeResult.data as IncomingMessage;
  };

  find = async (options?: { query?: string }): Promise<{ conversations: Conversation[] }> => {
    const response = await this.dependencies.esClient.search<Conversation>({
      index: this.dependencies.resources.aliases.conversations,
      allow_no_indices: true,
      query: {
        bool: {
          filter: [...this.getAccessQuery()],
        },
      },
      sort: {
        '@timestamp': 'desc',
      },
      size: 100,
    });

    return {
      conversations: response.hits.hits.map((hit) => hit._source!),
    };
  };

  update = async (conversation: ConversationUpdateRequest): Promise<Conversation> => {
    const document = await this.getConversationWithMetaFields(conversation.conversation.id);

    if (!document) {
      throw notFound();
    }

    const updatedConversation: Conversation = merge(
      {},
      conversation,
      this.getConversationUpdateValues(new Date().toISOString())
    );

    await this.dependencies.esClient.update({
      id: document._id,
      index: document._index,
      doc: updatedConversation,
    });

    return updatedConversation;
  };

  create = async (conversation: ConversationCreateRequest): Promise<Conversation> => {
    const now = new Date().toISOString();

    const createdConversation: Conversation = merge(
      {},
      conversation,
      {
        '@timestamp': now,
        conversation: { id: v4() },
      },
      this.getConversationUpdateValues(now)
    );

    await this.dependencies.esClient.index({
      index: this.dependencies.resources.aliases.conversations,
      document: createdConversation,
    });

    return createdConversation;
  };
}
