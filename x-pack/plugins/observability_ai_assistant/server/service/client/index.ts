/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import { internal, notFound } from '@hapi/boom';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { PublicMethodsOf } from '@kbn/utility-types';
import { compact, isEmpty, merge, omit } from 'lodash';
import type {
  ChatCompletionFunctions,
  ChatCompletionRequestMessage,
  CreateChatCompletionRequest,
  CreateChatCompletionResponse,
} from 'openai';
import { PassThrough, Readable } from 'stream';
import { v4 } from 'uuid';
import {
  MessageRole,
  type CompatibleJSONSchema,
  type Conversation,
  type ConversationCreateRequest,
  type ConversationUpdateRequest,
  type KnowledgeBaseEntry,
  type Message,
} from '../../../common/types';
import type { KnowledgeBaseService, RecalledEntry } from '../kb_service';
import type { ObservabilityAIAssistantResourceNames } from '../types';
import { getAccessQuery } from '../util/get_access_query';

export class ObservabilityAIAssistantClient {
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
      knowledgeBaseService: KnowledgeBaseService;
    }
  ) {}

  private getConversationWithMetaFields = async (
    conversationId: string
  ): Promise<SearchHit<Conversation> | undefined> => {
    const response = await this.dependencies.esClient.search<Conversation>({
      index: this.dependencies.resources.aliases.conversations,
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

  private getConversationUpdateValues = (now: string) => {
    return {
      conversation: {
        last_updated: now,
      },
      user: this.dependencies.user,
      namespace: this.dependencies.namespace,
    };
  };

  get = async (conversationId: string): Promise<Conversation> => {
    const conversation = await this.getConversationWithMetaFields(conversationId);

    if (!conversation) {
      throw notFound();
    }
    return conversation._source!;
  };

  delete = async (conversationId: string): Promise<void> => {
    const conversation = await this.getConversationWithMetaFields(conversationId);

    if (!conversation) {
      throw notFound();
    }

    await this.dependencies.esClient.delete({
      id: conversation._id,
      index: conversation._index,
      refresh: 'wait_for',
    });
  };

  chat = async <TStream extends boolean | undefined = true>({
    messages,
    connectorId,
    functions,
    functionCall,
    stream = true,
  }: {
    messages: Message[];
    connectorId: string;
    functions?: Array<{ name: string; description: string; parameters: CompatibleJSONSchema }>;
    functionCall?: string;
    stream?: TStream;
  }): Promise<TStream extends false ? CreateChatCompletionResponse : Readable> => {
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

    // add recalled information to system message, so the LLM considers it more important

    const recallMessages = messagesForOpenAI.filter((message) => message.name === 'recall');

    const recalledDocuments: Map<string, { id: string; text: string }> = new Map();

    recallMessages.forEach((message) => {
      const entries = message.content
        ? (JSON.parse(message.content) as Array<{ id: string; text: string }>)
        : [];

      const ids: string[] = [];

      entries.forEach((entry) => {
        const id = entry.id;
        if (!recalledDocuments.has(id)) {
          recalledDocuments.set(id, entry);
        }
        ids.push(id);
      });

      message.content = `The following documents, present in the system message, were recalled: ${ids.join(
        ', '
      )}`;
    });

    const systemMessage = messagesForOpenAI.find((message) => message.role === MessageRole.System);

    if (systemMessage && recalledDocuments.size > 0) {
      systemMessage.content += `The "recall" function is not available. Do not attempt to execute it. Recalled documents: ${JSON.stringify(
        Array.from(recalledDocuments.values())
      )}`;
    }

    const functionsForOpenAI: ChatCompletionFunctions[] | undefined =
      recalledDocuments.size > 0 ? functions?.filter((fn) => fn.name !== 'recall') : functions;

    const request: Omit<CreateChatCompletionRequest, 'model'> & { model?: string } = {
      messages: messagesForOpenAI,
      stream: true,
      functions: functionsForOpenAI,
      temperature: 0,
      function_call: functionCall ? { name: functionCall } : undefined,
    };

    const executeResult = await this.dependencies.actionsClient.execute({
      actionId: connectorId,
      params: {
        subAction: stream ? 'stream' : 'run',
        subActionParams: {
          body: JSON.stringify(request),
          ...(stream ? { stream: true } : {}),
        },
      },
    });

    if (executeResult.status === 'error') {
      throw internal(`${executeResult?.message} - ${executeResult?.serviceMessage}`);
    }

    const response = stream
      ? ((executeResult.data as Readable).pipe(new PassThrough()) as Readable)
      : (executeResult.data as CreateChatCompletionResponse);

    return response as any;
  };

  find = async (options?: { query?: string }): Promise<{ conversations: Conversation[] }> => {
    const response = await this.dependencies.esClient.search<Conversation>({
      index: this.dependencies.resources.aliases.conversations,
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
      refresh: 'wait_for',
    });

    return updatedConversation;
  };

  autoTitle = async ({
    conversationId,
    connectorId,
  }: {
    conversationId: string;
    connectorId: string;
  }) => {
    const document = await this.getConversationWithMetaFields(conversationId);
    if (!document) {
      throw notFound();
    }

    const conversation = await this.get(conversationId);

    if (!conversation) {
      throw notFound();
    }

    const response = await this.chat({
      messages: [
        {
          '@timestamp': new Date().toISOString(),
          message: {
            role: MessageRole.Assistant,
            content: conversation.messages.slice(1).reduce((acc, curr) => {
              return `${acc} ${curr.message.role}: ${curr.message.content}`;
            }, 'You are a helpful assistant for Elastic Observability. Assume the following message is the start of a conversation between you and a user; give this conversation a title based on this content: '),
          },
        },
      ],
      connectorId,
      stream: false,
    });

    if ('object' in response && response.object === 'chat.completion') {
      const input =
        response.choices[0].message?.content || `Conversation on ${conversation['@timestamp']}`;

      // This regular expression captures a string enclosed in single or double quotes.
      // It extracts the string content without the quotes.
      // Example matches:
      // - "Hello, World!" => Captures: Hello, World!
      // - 'Another Example' => Captures: Another Example
      // - JustTextWithoutQuotes => Captures: JustTextWithoutQuotes
      const match = input.match(/^["']?([^"']+)["']?$/);
      const title = match ? match[1] : input;

      const updatedConversation: Conversation = merge(
        {},
        conversation,
        { conversation: { title } },
        this.getConversationUpdateValues(new Date().toISOString())
      );

      await this.setTitle({ conversationId, title });

      return updatedConversation;
    }
    return conversation;
  };

  setTitle = async ({ conversationId, title }: { conversationId: string; title: string }) => {
    const document = await this.getConversationWithMetaFields(conversationId);
    if (!document) {
      throw notFound();
    }

    const conversation = await this.get(conversationId);

    if (!conversation) {
      throw notFound();
    }

    const updatedConversation: Conversation = merge(
      {},
      conversation,
      { conversation: { title } },
      this.getConversationUpdateValues(new Date().toISOString())
    );

    await this.dependencies.esClient.update({
      id: document._id,
      index: document._index,
      doc: { conversation: { title } },
      refresh: 'wait_for',
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
      refresh: 'wait_for',
    });

    return createdConversation;
  };

  recall = async ({
    queries,
    contexts,
  }: {
    queries: string[];
    contexts?: string[];
  }): Promise<{ entries: RecalledEntry[] }> => {
    return this.dependencies.knowledgeBaseService.recall({
      namespace: this.dependencies.namespace,
      user: this.dependencies.user,
      queries,
      contexts,
    });
  };

  summarize = async ({
    entry,
  }: {
    entry: Omit<KnowledgeBaseEntry, '@timestamp'>;
  }): Promise<void> => {
    return this.dependencies.knowledgeBaseService.summarize({
      namespace: this.dependencies.namespace,
      user: this.dependencies.user,
      entry,
    });
  };

  getKnowledgeBaseStatus = () => {
    return this.dependencies.knowledgeBaseService.status();
  };

  setupKnowledgeBase = () => {
    return this.dependencies.knowledgeBaseService.setup();
  };
}
