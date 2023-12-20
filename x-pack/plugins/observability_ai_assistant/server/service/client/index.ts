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
import { compact, isEmpty, last, merge, omit, pick } from 'lodash';
import type {
  ChatCompletionRequestMessage,
  CreateChatCompletionRequest,
  CreateChatCompletionResponse,
} from 'openai';
import { isObservable, lastValueFrom } from 'rxjs';
import { PassThrough, Readable } from 'stream';
import { v4 } from 'uuid';
import {
  ConversationNotFoundError,
  isChatCompletionError,
  StreamingChatResponseEventType,
  type StreamingChatResponseEvent,
} from '../../../common/conversation_complete';
import {
  FunctionResponse,
  MessageRole,
  type CompatibleJSONSchema,
  type Conversation,
  type ConversationCreateRequest,
  type ConversationUpdateRequest,
  type KnowledgeBaseEntry,
  type Message,
} from '../../../common/types';
import { concatenateOpenAiChunks } from '../../../common/utils/concatenate_openai_chunks';
import { processOpenAiStream } from '../../../common/utils/process_openai_stream';
import type { ChatFunctionClient } from '../chat_function_client';
import {
  KnowledgeBaseEntryOperationType,
  KnowledgeBaseService,
  RecalledEntry,
} from '../knowledge_base_service';
import type { ObservabilityAIAssistantResourceNames } from '../types';
import { getAccessQuery } from '../util/get_access_query';
import { streamIntoObservable } from '../util/stream_into_observable';
import { handleLlmResponse } from './handle_llm_response';

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
      refresh: true,
    });
  };

  complete = async (
    params: {
      messages: Message[];
      connectorId: string;
      signal: AbortSignal;
      functionClient: ChatFunctionClient;
      persist: boolean;
    } & ({ conversationId: string } | { title?: string })
  ) => {
    const stream = new PassThrough();

    const { messages, connectorId, signal, functionClient, persist } = params;

    let conversationId: string = '';
    let title: string = '';
    if ('conversationId' in params) {
      conversationId = params.conversationId;
    }

    if ('title' in params) {
      title = params.title || '';
    }

    function write(event: StreamingChatResponseEvent) {
      if (stream.destroyed) {
        return Promise.resolve();
      }

      return new Promise<void>((resolve, reject) => {
        stream.write(`${JSON.stringify(event)}\n`, 'utf-8', (err) => {
          if (err) {
            reject(err);
            return;
          }
          resolve();
        });
      });
    }

    function fail(error: Error) {
      const code = isChatCompletionError(error) ? error.code : undefined;
      write({
        type: StreamingChatResponseEventType.ConversationCompletionError,
        error: {
          message: error.message,
          stack: error.stack,
          code,
        },
      }).finally(() => {
        stream.end();
      });
    }

    const next = async (nextMessages: Message[]): Promise<void> => {
      const lastMessage = last(nextMessages);

      const isUserMessage = lastMessage?.message.role === MessageRole.User;

      const isUserMessageWithoutFunctionResponse = isUserMessage && !lastMessage?.message.name;

      const recallFirst =
        isUserMessageWithoutFunctionResponse && functionClient.hasFunction('recall');

      const isAssistantMessageWithFunctionRequest =
        lastMessage?.message.role === MessageRole.Assistant &&
        !!lastMessage?.message.function_call?.name;

      if (recallFirst) {
        const addedMessage = {
          '@timestamp': new Date().toISOString(),
          message: {
            role: MessageRole.Assistant,
            content: '',
            function_call: {
              name: 'recall',
              arguments: JSON.stringify({
                queries: [],
                contexts: [],
              }),
              trigger: MessageRole.Assistant as const,
            },
          },
        };
        await write({
          type: StreamingChatResponseEventType.MessageAdd,
          id: v4(),
          message: addedMessage,
        });
        return await next(nextMessages.concat(addedMessage));
      } else if (isUserMessage) {
        const { message } = await handleLlmResponse({
          signal,
          write,
          source$: streamIntoObservable(
            await this.chat({
              messages: nextMessages,
              connectorId,
              stream: true,
              signal,
              functions: functionClient
                .getFunctions()
                .map((fn) => pick(fn.definition, 'name', 'description', 'parameters')),
            })
          ).pipe(processOpenAiStream()),
        });
        return await next(nextMessages.concat({ message, '@timestamp': new Date().toISOString() }));
      }

      if (isAssistantMessageWithFunctionRequest) {
        const functionResponse = await functionClient
          .executeFunction({
            connectorId,
            name: lastMessage.message.function_call!.name,
            messages: nextMessages,
            args: lastMessage.message.function_call!.arguments,
            signal,
          })
          .catch((error): FunctionResponse => {
            return {
              content: {
                message: error.toString(),
                error,
              },
            };
          });

        if (signal.aborted) {
          return;
        }

        const functionResponseIsObservable = isObservable(functionResponse);

        const functionResponseMessage = {
          '@timestamp': new Date().toISOString(),
          message: {
            name: lastMessage.message.function_call!.name,
            ...(functionResponseIsObservable
              ? { content: '{}' }
              : {
                  content: JSON.stringify(functionResponse.content || {}),
                  data: functionResponse.data ? JSON.stringify(functionResponse.data) : undefined,
                }),
            role: MessageRole.User,
          },
        };

        nextMessages = nextMessages.concat(functionResponseMessage);
        await write({
          type: StreamingChatResponseEventType.MessageAdd,
          message: functionResponseMessage,
          id: v4(),
        });

        if (functionResponseIsObservable) {
          const { message } = await handleLlmResponse({
            signal,
            write,
            source$: functionResponse,
          });
          return await next(
            nextMessages.concat({ '@timestamp': new Date().toISOString(), message })
          );
        }
        return await next(nextMessages);
      }

      if (!persist) {
        stream.end();
        return;
      }

      // store the updated conversation and close the stream
      if (conversationId) {
        const conversation = await this.getConversationWithMetaFields(conversationId);
        if (!conversation) {
          throw new ConversationNotFoundError();
        }

        if (signal.aborted) {
          return;
        }

        const updatedConversation = await this.update(
          merge({}, omit(conversation._source, 'messages'), { messages: nextMessages })
        );
        await write({
          type: StreamingChatResponseEventType.ConversationUpdate,
          conversation: updatedConversation.conversation,
        });
      } else {
        const generatedTitle = await titlePromise;
        if (signal.aborted) {
          return;
        }

        const conversation = await this.create({
          '@timestamp': new Date().toISOString(),
          conversation: {
            title: generatedTitle || title || 'New conversation',
          },
          messages: nextMessages,
          labels: {},
          numeric_labels: {},
          public: false,
        });
        await write({
          type: StreamingChatResponseEventType.ConversationCreate,
          conversation: conversation.conversation,
        });
      }

      stream.end();
    };

    next(messages).catch((error) => {
      if (!signal.aborted) {
        this.dependencies.logger.error(error);
      }
      fail(error);
    });

    const titlePromise =
      !conversationId && !title && persist
        ? this.getGeneratedTitle({
            messages,
            connectorId,
            signal,
          }).catch((error) => {
            this.dependencies.logger.error(
              'Could not generate title, falling back to default title'
            );
            this.dependencies.logger.error(error);
            return Promise.resolve(undefined);
          })
        : Promise.resolve(undefined);

    signal.addEventListener('abort', () => {
      stream.end();
    });

    return stream;
  };

  chat = async <TStream extends boolean | undefined = true>({
    messages,
    connectorId,
    functions,
    functionCall,
    stream = true,
    signal,
  }: {
    messages: Message[];
    connectorId: string;
    functions?: Array<{ name: string; description: string; parameters: CompatibleJSONSchema }>;
    functionCall?: string;
    stream?: TStream;
    signal: AbortSignal;
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

    const functionsForOpenAI = functions;

    const request: Omit<CreateChatCompletionRequest, 'model'> & { model?: string } = {
      messages: messagesForOpenAI,
      ...(stream ? { stream: true } : {}),
      ...(!!functions?.length ? { functions: functionsForOpenAI } : {}),
      temperature: 0,
      function_call: functionCall ? { name: functionCall } : undefined,
    };

    this.dependencies.logger.debug(`Sending conversation to connector`);
    this.dependencies.logger.debug(JSON.stringify(request, null, 2));

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
      ? (executeResult.data as Readable)
      : (executeResult.data as CreateChatCompletionResponse);

    if (response instanceof PassThrough) {
      signal.addEventListener('abort', () => {
        response.end();
      });
    }

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
      refresh: true,
    });

    return updatedConversation;
  };

  getGeneratedTitle = async ({
    messages,
    connectorId,
    signal,
  }: {
    messages: Message[];
    connectorId: string;
    signal: AbortSignal;
  }) => {
    const stream = await this.chat({
      messages: [
        {
          '@timestamp': new Date().toISOString(),
          message: {
            role: MessageRole.User,
            content: messages.slice(1).reduce((acc, curr) => {
              return `${acc} ${curr.message.role}: ${curr.message.content}`;
            }, 'You are a helpful assistant for Elastic Observability. Assume the following message is the start of a conversation between you and a user; give this conversation a title based on the content below. DO NOT UNDER ANY CIRCUMSTANCES wrap this title in single or double quotes. This title is shown in a list of conversations to the user, so title it for the user, not for you. Here is the content:'),
          },
        },
      ],
      connectorId,
      stream: true,
      signal,
    });

    const response = await lastValueFrom(
      streamIntoObservable(stream).pipe(processOpenAiStream(), concatenateOpenAiChunks())
    );

    const input = response.message?.content || '';

    // This regular expression captures a string enclosed in single or double quotes.
    // It extracts the string content without the quotes.
    // Example matches:
    // - "Hello, World!" => Captures: Hello, World!
    // - 'Another Example' => Captures: Another Example
    // - JustTextWithoutQuotes => Captures: JustTextWithoutQuotes
    const match = input.match(/^["']?([^"']+)["']?$/);
    const title = match ? match[1] : input;
    return title;
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
      refresh: true,
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
      refresh: true,
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

  getKnowledgeBaseStatus = () => {
    return this.dependencies.knowledgeBaseService.status();
  };

  setupKnowledgeBase = () => {
    return this.dependencies.knowledgeBaseService.setup();
  };

  createKnowledgeBaseEntry = async ({
    entry,
  }: {
    entry: Omit<KnowledgeBaseEntry, '@timestamp'>;
  }): Promise<void> => {
    return this.dependencies.knowledgeBaseService.addEntry({
      namespace: this.dependencies.namespace,
      user: this.dependencies.user,
      entry,
    });
  };

  importKnowledgeBaseEntries = async ({
    entries,
  }: {
    entries: Array<Omit<KnowledgeBaseEntry, '@timestamp'>>;
  }): Promise<void> => {
    const operations = entries.map((entry) => ({
      type: KnowledgeBaseEntryOperationType.Index,
      document: { ...entry, '@timestamp': new Date().toISOString() },
    }));

    await this.dependencies.knowledgeBaseService.addEntries({ operations });
  };

  getKnowledgeBaseEntries = async ({
    query,
    sortBy,
    sortDirection,
  }: {
    query: string;
    sortBy: string;
    sortDirection: 'asc' | 'desc';
  }) => {
    return this.dependencies.knowledgeBaseService.getEntries({ query, sortBy, sortDirection });
  };

  deleteKnowledgeBaseEntry = async (id: string) => {
    return this.dependencies.knowledgeBaseService.deleteEntry({ id });
  };
}
