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
import { decode, encode } from 'gpt-tokenizer';
import { compact, isEmpty, last, merge, noop, omit, pick, take } from 'lodash';
import type OpenAI from 'openai';
import { filter, isObservable, lastValueFrom, Observable, shareReplay, toArray } from 'rxjs';
import { Readable } from 'stream';
import { v4 } from 'uuid';
import {
  ChatCompletionChunkEvent,
  ChatCompletionErrorEvent,
  createConversationNotFoundError,
  MessageAddEvent,
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
import { concatenateChatCompletionChunks } from '../../../common/utils/concatenate_chat_completion_chunks';
import { emitWithConcatenatedMessage } from '../../../common/utils/emit_with_concatenated_message';
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

export class ObservabilityAIAssistantClient {
  constructor(
    private readonly dependencies: {
      actionsClient: PublicMethodsOf<ActionsClient>;
      namespace: string;
      esClient: {
        asInternalUser: ElasticsearchClient;
        asCurrentUser: ElasticsearchClient;
      };
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
    const response = await this.dependencies.esClient.asInternalUser.search<Conversation>({
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

    await this.dependencies.esClient.asInternalUser.delete({
      id: conversation._id,
      index: conversation._index,
      refresh: true,
    });
  };

  complete = (
    params: {
      messages: Message[];
      connectorId: string;
      signal: AbortSignal;
      functionClient: ChatFunctionClient;
      persist: boolean;
    } & ({ conversationId: string } | { title?: string })
  ): Observable<Exclude<StreamingChatResponseEvent, ChatCompletionErrorEvent>> => {
    return new Observable<Exclude<StreamingChatResponseEvent, ChatCompletionErrorEvent>>(
      (subscriber) => {
        const { messages, connectorId, signal, functionClient, persist } = params;

        let conversationId: string = '';
        let title: string = '';
        if ('conversationId' in params) {
          conversationId = params.conversationId;
        }

        if ('title' in params) {
          title = params.title || '';
        }

        let numFunctionsCalled: number = 0;

        const MAX_FUNCTION_CALLS = 5;
        const MAX_FUNCTION_RESPONSE_TOKEN_COUNT = 4000;

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

            subscriber.next({
              type: StreamingChatResponseEventType.MessageAdd,
              id: v4(),
              message: addedMessage,
            });

            return await next(nextMessages.concat(addedMessage));
          } else if (isUserMessage) {
            const response$ = (
              await this.chat({
                messages: nextMessages,
                connectorId,
                signal,
                functions:
                  numFunctionsCalled >= MAX_FUNCTION_CALLS
                    ? []
                    : functionClient
                        .getFunctions()
                        .map((fn) => pick(fn.definition, 'name', 'description', 'parameters')),
              })
            ).pipe(emitWithConcatenatedMessage(), shareReplay());

            response$.subscribe({
              next: (val) => subscriber.next(val),
              // we handle the error below
              error: noop,
            });

            const emittedMessageEvents = await lastValueFrom(
              response$.pipe(
                filter(
                  (event): event is MessageAddEvent =>
                    event.type === StreamingChatResponseEventType.MessageAdd
                ),
                toArray()
              )
            );

            return await next(
              nextMessages.concat(emittedMessageEvents.map((event) => event.message))
            );
          }

          if (isAssistantMessageWithFunctionRequest) {
            const functionResponse =
              numFunctionsCalled >= MAX_FUNCTION_CALLS
                ? {
                    content: {
                      error: {},
                      message: 'Function limit exceeded, ask the user what to do next',
                    },
                  }
                : await functionClient
                    .executeFunction({
                      connectorId,
                      name: lastMessage.message.function_call!.name,
                      messages: nextMessages,
                      args: lastMessage.message.function_call!.arguments,
                      signal,
                    })
                    .then((response) => {
                      if (isObservable(response)) {
                        return response;
                      }

                      const encoded = encode(JSON.stringify(response.content || {}));

                      if (encoded.length <= MAX_FUNCTION_RESPONSE_TOKEN_COUNT) {
                        return response;
                      }

                      return {
                        data: response.data,
                        content: {
                          message:
                            'Function response exceeded the maximum length allowed and was truncated',
                          truncated: decode(take(encoded, MAX_FUNCTION_RESPONSE_TOKEN_COUNT)),
                        },
                      };
                    })
                    .catch((error): FunctionResponse => {
                      return {
                        content: {
                          message: error.toString(),
                          error,
                        },
                      };
                    });

            numFunctionsCalled++;

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
                      data: functionResponse.data
                        ? JSON.stringify(functionResponse.data)
                        : undefined,
                    }),
                role: MessageRole.User,
              },
            };

            nextMessages = nextMessages.concat(functionResponseMessage);

            subscriber.next({
              type: StreamingChatResponseEventType.MessageAdd,
              message: functionResponseMessage,
              id: v4(),
            });

            if (functionResponseIsObservable) {
              const shared = functionResponse.pipe(shareReplay());

              shared.subscribe({
                next: (val) => subscriber.next(val),
                // we handle the error below
                error: noop,
              });

              const messageEvents = await lastValueFrom(
                shared.pipe(
                  filter(
                    (event): event is MessageAddEvent =>
                      event.type === StreamingChatResponseEventType.MessageAdd
                  ),
                  toArray()
                )
              );

              return await next(nextMessages.concat(messageEvents.map((event) => event.message)));
            }
            return await next(nextMessages);
          }

          if (!persist) {
            subscriber.complete();
            return;
          }

          // store the updated conversation and close the stream
          if (conversationId) {
            const conversation = await this.getConversationWithMetaFields(conversationId);
            if (!conversation) {
              throw createConversationNotFoundError();
            }

            if (signal.aborted) {
              return;
            }

            const updatedConversation = await this.update(
              merge({}, omit(conversation._source, 'messages'), { messages: nextMessages })
            );
            subscriber.next({
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

            subscriber.next({
              type: StreamingChatResponseEventType.ConversationCreate,
              conversation: conversation.conversation,
            });
          }

          subscriber.complete();
        };

        next(messages).catch((error) => {
          if (!signal.aborted) {
            this.dependencies.logger.error(error);
          }
          subscriber.error(error);
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
      }
    ).pipe(shareReplay());
  };

  chat = async ({
    messages,
    connectorId,
    functions,
    functionCall,
    signal,
  }: {
    messages: Message[];
    connectorId: string;
    functions?: Array<{ name: string; description: string; parameters: CompatibleJSONSchema }>;
    functionCall?: string;
    signal: AbortSignal;
  }): Promise<Observable<ChatCompletionChunkEvent>> => {
    const messagesForOpenAI: Array<
      Omit<OpenAI.ChatCompletionMessageParam, 'role'> & {
        role: MessageRole;
      }
    > = compact(
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

    const request: Omit<OpenAI.ChatCompletionCreateParams, 'model'> & { model?: string } = {
      messages: messagesForOpenAI as OpenAI.ChatCompletionCreateParams['messages'],
      stream: true,
      ...(!!functions?.length ? { functions: functionsForOpenAI } : {}),
      temperature: 0,
      function_call: functionCall ? { name: functionCall } : undefined,
    };

    this.dependencies.logger.debug(`Sending conversation to connector`);
    this.dependencies.logger.trace(JSON.stringify(request, null, 2));

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

    const response = executeResult.data as Readable;

    signal.addEventListener('abort', () => response.destroy());

    return streamIntoObservable(response).pipe(processOpenAiStream(), shareReplay());
  };

  find = async (options?: { query?: string }): Promise<{ conversations: Conversation[] }> => {
    const response = await this.dependencies.esClient.asInternalUser.search<Conversation>({
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

    await this.dependencies.esClient.asInternalUser.update({
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
    const response$ = await this.chat({
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
      signal,
    });

    const response = await lastValueFrom(response$.pipe(concatenateChatCompletionChunks()));

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

    await this.dependencies.esClient.asInternalUser.update({
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

    await this.dependencies.esClient.asInternalUser.index({
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
      asCurrentUser: this.dependencies.esClient.asCurrentUser,
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
