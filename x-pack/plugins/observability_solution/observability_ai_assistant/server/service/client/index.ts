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
import apm from 'elastic-apm-node';
import { decode, encode } from 'gpt-tokenizer';
import { last, merge, noop, omit, pick, take } from 'lodash';
import {
  filter,
  isObservable,
  last as lastOperator,
  lastValueFrom,
  Observable,
  shareReplay,
  tap,
  toArray,
} from 'rxjs';
import { Readable } from 'stream';
import { v4 } from 'uuid';
import { withTokenBudget } from '../../../common/utils/with_token_budget';
import { extendSystemMessage } from '../../../common/utils/extend_system_message';
import { ObservabilityAIAssistantConnectorType } from '../../../common/connectors';
import {
  ChatCompletionChunkEvent,
  ChatCompletionErrorEvent,
  createConversationNotFoundError,
  createTokenLimitReachedError,
  MessageAddEvent,
  StreamingChatResponseEventType,
  TokenCountEvent,
  type StreamingChatResponseEvent,
} from '../../../common/conversation_complete';
import {
  CompatibleJSONSchema,
  FunctionResponse,
  FunctionVisibility,
} from '../../../common/functions/types';
import {
  MessageRole,
  UserInstruction,
  type Conversation,
  type ConversationCreateRequest,
  type ConversationUpdateRequest,
  type KnowledgeBaseEntry,
  type Message,
} from '../../../common/types';
import { concatenateChatCompletionChunks } from '../../../common/utils/concatenate_chat_completion_chunks';
import { createFunctionResponseError } from '../../../common/utils/create_function_response_error';
import { emitWithConcatenatedMessage } from '../../../common/utils/emit_with_concatenated_message';
import type { ChatFunctionClient } from '../chat_function_client';
import {
  KnowledgeBaseEntryOperationType,
  KnowledgeBaseService,
  RecalledEntry,
} from '../knowledge_base_service';
import type { ChatFn, ObservabilityAIAssistantResourceNames } from '../types';
import { getAccessQuery } from '../util/get_access_query';
import { rejectTokenCountEvents } from '../util/reject_token_count_events';
import { createBedrockClaudeAdapter } from './adapters/bedrock/bedrock_claude_adapter';
import { createOpenAiAdapter } from './adapters/openai_adapter';
import { LlmApiAdapter } from './adapters/types';

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

  private getConversationUpdateValues = (lastUpdated: string) => {
    return {
      conversation: {
        last_updated: lastUpdated,
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

  complete = (params: {
    messages: Message[];
    connectorId: string;
    signal: AbortSignal;
    functionClient: ChatFunctionClient;
    persist: boolean;
    responseLanguage?: string;
    conversationId?: string;
    title?: string;
    instructions?: Array<string | UserInstruction>;
  }): Observable<Exclude<StreamingChatResponseEvent, ChatCompletionErrorEvent>> => {
    return new Observable<Exclude<StreamingChatResponseEvent, ChatCompletionErrorEvent>>(
      (subscriber) => {
        const { messages, connectorId, signal, functionClient, persist } = params;

        const conversationId = params.conversationId || '';
        const title = params.title || '';
        const responseLanguage = params.responseLanguage || 'English';
        const requestInstructions = params.instructions || [];

        const tokenCountResult = {
          prompt: 0,
          completion: 0,
          total: 0,
        };

        const chatWithTokenCountIncrement: ChatFn = async (...chatArgs) => {
          const response$ = await this.chat(...chatArgs);

          const incrementTokenCount = () => {
            return <T extends ChatCompletionChunkEvent | TokenCountEvent>(
              source: Observable<T>
            ): Observable<T> => {
              return source.pipe(
                tap((event) => {
                  if (event.type === StreamingChatResponseEventType.TokenCount) {
                    tokenCountResult.prompt += event.tokens.prompt;
                    tokenCountResult.completion += event.tokens.completion;
                    tokenCountResult.total += event.tokens.total;
                  }
                })
              );
            };
          };

          return response$.pipe(incrementTokenCount(), rejectTokenCountEvents());
        };

        let numFunctionsCalled: number = 0;

        const MAX_FUNCTION_CALLS = 5;
        const MAX_FUNCTION_RESPONSE_TOKEN_COUNT = 4000;

        const allFunctions = functionClient
          .getFunctions()
          .filter((fn) => {
            const visibility = fn.definition.visibility ?? FunctionVisibility.All;
            return (
              visibility === FunctionVisibility.All ||
              visibility === FunctionVisibility.AssistantOnly
            );
          })
          .map((fn) => pick(fn.definition, 'name', 'description', 'parameters'));

        const allActions = functionClient.getActions();

        const next = async (nextMessages: Message[]): Promise<void> => {
          const lastMessage = last(nextMessages);

          const isUserMessage = lastMessage?.message.role === MessageRole.User;

          const isUserMessageWithoutFunctionResponse = isUserMessage && !lastMessage?.message.name;

          const contextFirst =
            isUserMessageWithoutFunctionResponse && functionClient.hasFunction('context');

          const isAssistantMessageWithFunctionRequest =
            lastMessage?.message.role === MessageRole.Assistant &&
            !!lastMessage?.message.function_call?.name;

          if (contextFirst) {
            const addedMessage = {
              '@timestamp': new Date().toISOString(),
              message: {
                role: MessageRole.Assistant,
                content: '',
                function_call: {
                  name: 'context',
                  arguments: JSON.stringify({
                    queries: [],
                    categories: [],
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
            const functions =
              numFunctionsCalled === MAX_FUNCTION_CALLS ? [] : allFunctions.concat(allActions);

            const response$ = (
              await chatWithTokenCountIncrement(
                lastMessage.message.name && lastMessage.message.name !== 'context'
                  ? 'function_response'
                  : 'user_message',
                {
                  messages: nextMessages,
                  connectorId,
                  signal,
                  functions,
                }
              )
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
            const functionCallName = lastMessage.message.function_call!.name;

            if (functionClient.hasAction(functionCallName)) {
              this.dependencies.logger.debug(`Executing client-side action: ${functionCallName}`);

              // if validation fails, return the error to the LLM.
              // otherwise, close the stream.

              try {
                functionClient.validate(
                  functionCallName,
                  JSON.parse(lastMessage.message.function_call!.arguments || '{}')
                );
              } catch (error) {
                const functionResponseMessage = createFunctionResponseError({
                  name: functionCallName,
                  error,
                });
                nextMessages = nextMessages.concat(functionResponseMessage.message);

                subscriber.next(functionResponseMessage);

                return await next(nextMessages);
              }

              subscriber.complete();

              return;
            }

            const span = apm.startSpan(`execute_function ${functionCallName}`);

            span?.addLabels({
              ai_assistant_args: JSON.stringify(lastMessage.message.function_call!.arguments ?? {}),
            });

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
                      chat: chatWithTokenCountIncrement,
                      connectorId,
                      name: functionCallName,
                      messages: nextMessages,
                      args: lastMessage.message.function_call!.arguments,
                      signal,
                    })
                    .then((response) => {
                      if (isObservable(response)) {
                        return response;
                      }

                      span?.setOutcome('success');

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
                      span?.setOutcome('failure');
                      return {
                        content: {
                          message: error.toString(),
                          error,
                        },
                      };
                    });

            numFunctionsCalled++;

            if (signal.aborted) {
              span?.end();
              return;
            }

            if (isObservable(functionResponse)) {
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

              span?.end();

              return await next(nextMessages.concat(messageEvents.map((event) => event.message)));
            }

            const functionResponseMessage = {
              '@timestamp': new Date().toISOString(),
              message: {
                name: lastMessage.message.function_call!.name,

                content: JSON.stringify(functionResponse.content || {}),
                data: functionResponse.data ? JSON.stringify(functionResponse.data) : undefined,
                role: MessageRole.User,
              },
            };

            this.dependencies.logger.debug(
              `Function response: ${JSON.stringify(functionResponseMessage, null, 2)}`
            );
            nextMessages = nextMessages.concat(functionResponseMessage);

            subscriber.next({
              type: StreamingChatResponseEventType.MessageAdd,
              message: functionResponseMessage,
              id: v4(),
            });

            span?.end();

            return await next(nextMessages);
          }

          this.dependencies.logger.debug(`Conversation: ${JSON.stringify(nextMessages, null, 2)}`);

          if (!persist) {
            subscriber.complete();
            return;
          }

          this.dependencies.logger.debug(
            `Token count for conversation: ${JSON.stringify(tokenCountResult)}`
          );

          apm.currentTransaction?.addLabels({
            tokenCountPrompt: tokenCountResult.prompt,
            tokenCountCompletion: tokenCountResult.completion,
            tokenCountTotal: tokenCountResult.total,
          });

          // store the updated conversation and close the stream
          if (conversationId) {
            const conversation = await this.getConversationWithMetaFields(conversationId);
            if (!conversation) {
              throw createConversationNotFoundError();
            }

            if (signal.aborted) {
              return;
            }

            const persistedTokenCount = conversation._source?.conversation.token_count;

            const updatedConversation = await this.update(
              conversationId,

              merge(
                {},

                // base conversation without messages
                omit(conversation._source, 'messages'),

                // update messages
                { messages: nextMessages },

                // update token count
                {
                  conversation: {
                    token_count: {
                      prompt: (persistedTokenCount?.prompt || 0) + tokenCountResult.prompt,
                      completion:
                        (persistedTokenCount?.completion || 0) + tokenCountResult.completion,
                      total: (persistedTokenCount?.total || 0) + tokenCountResult.total,
                    },
                  },
                }
              )
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
                token_count: tokenCountResult,
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

        this.resolveInstructions(requestInstructions)
          .then((instructions) => {
            return next(
              extendSystemMessage(messages, [
                `You MUST respond in the users preferred language which is: ${responseLanguage}.`,
                instructions,
              ])
            );
          })
          .catch((error) => {
            if (!signal.aborted) {
              this.dependencies.logger.error(error);
            }
            subscriber.error(error);
          });

        const titlePromise =
          !conversationId && !title && persist
            ? this.getGeneratedTitle({
                chat: chatWithTokenCountIncrement,
                messages,
                connectorId,
                signal,
                responseLanguage,
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

  chat = async (
    name: string,
    {
      messages,
      connectorId,
      functions,
      functionCall,
      signal,
    }: {
      messages: Message[];
      connectorId: string;
      functions?: Array<{ name: string; description: string; parameters?: CompatibleJSONSchema }>;
      functionCall?: string;
      signal: AbortSignal;
    }
  ): Promise<Observable<ChatCompletionChunkEvent | TokenCountEvent>> => {
    const span = apm.startSpan(`chat ${name}`);

    const spanId = (span?.ids['span.id'] || '').substring(0, 6);

    const loggerPrefix = `${name}${spanId ? ` (${spanId})` : ''}`;

    try {
      const connector = await this.dependencies.actionsClient.get({
        id: connectorId,
      });

      let adapter: LlmApiAdapter;

      this.dependencies.logger.debug(`Creating "${connector.actionTypeId}" adapter`);

      switch (connector.actionTypeId) {
        case ObservabilityAIAssistantConnectorType.OpenAI:
          adapter = createOpenAiAdapter({
            messages,
            functions,
            functionCall,
            logger: this.dependencies.logger,
          });
          break;

        case ObservabilityAIAssistantConnectorType.Bedrock:
          adapter = createBedrockClaudeAdapter({
            messages,
            functions,
            functionCall,
            logger: this.dependencies.logger,
          });
          break;

        default:
          throw new Error(`Connector type is not supported: ${connector.actionTypeId}`);
      }

      const subAction = adapter.getSubAction();

      this.dependencies.logger.debug(`${loggerPrefix}: Sending conversation to connector`);
      this.dependencies.logger.trace(
        `${loggerPrefix}:\n${JSON.stringify(subAction.subActionParams, null, 2)}`
      );

      const now = performance.now();

      const executeResult = await this.dependencies.actionsClient.execute({
        actionId: connectorId,
        params: subAction,
      });

      this.dependencies.logger.debug(
        `${loggerPrefix}: Received action client response: ${
          executeResult.status
        } (took: ${Math.round(performance.now() - now)}ms)`
      );

      if (executeResult.status === 'error' && executeResult?.serviceMessage) {
        const tokenLimitRegex =
          /This model's maximum context length is (\d+) tokens\. However, your messages resulted in (\d+) tokens/g;
        const tokenLimitRegexResult = tokenLimitRegex.exec(executeResult.serviceMessage);

        if (tokenLimitRegexResult) {
          const [, tokenLimit, tokenCount] = tokenLimitRegexResult;
          throw createTokenLimitReachedError(parseInt(tokenLimit, 10), parseInt(tokenCount, 10));
        }
      }

      if (executeResult.status === 'error') {
        throw internal(`${executeResult?.message} - ${executeResult?.serviceMessage}`);
      }

      const response = executeResult.data as Readable;

      signal.addEventListener('abort', () => response.destroy());

      const response$ = adapter.streamIntoObservable(response).pipe(shareReplay());

      response$
        .pipe(rejectTokenCountEvents(), concatenateChatCompletionChunks(), lastOperator())
        .subscribe({
          error: (error) => {
            this.dependencies.logger.debug('Error in chat response');
            this.dependencies.logger.debug(error);
            span?.setOutcome('failure');
            span?.end();
          },
          next: (message) => {
            this.dependencies.logger.debug(`Received message:\n${JSON.stringify(message)}`);
          },
          complete: () => {
            span?.setOutcome('success');
            span?.end();
          },
        });

      response$.subscribe({
        next: (event) => {
          if (event.type === StreamingChatResponseEventType.TokenCount) {
            span?.addLabels({
              tokenCountPrompt: event.tokens.prompt,
              tokenCountCompletion: event.tokens.completion,
              tokenCountTotal: event.tokens.total,
            });
          }
        },
        error: () => {},
      });

      return response$;
    } catch (error) {
      span?.setOutcome('failure');
      span?.end();
      throw error;
    }
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

  update = async (
    conversationId: string,
    conversation: ConversationUpdateRequest
  ): Promise<Conversation> => {
    const persistedConversation = await this.getConversationWithMetaFields(conversationId);

    if (!persistedConversation) {
      throw notFound();
    }

    const updatedConversation: Conversation = merge(
      {},
      conversation,
      this.getConversationUpdateValues(new Date().toISOString())
    );

    await this.dependencies.esClient.asInternalUser.update({
      id: persistedConversation._id,
      index: persistedConversation._index,
      doc: updatedConversation,
      refresh: true,
    });

    return updatedConversation;
  };

  getGeneratedTitle = async ({
    chat,
    messages,
    connectorId,
    signal,
    responseLanguage,
  }: {
    chat: (
      ...chatParams: Parameters<InstanceType<typeof ObservabilityAIAssistantClient>['chat']>
    ) => Promise<Observable<ChatCompletionChunkEvent>>;
    messages: Message[];
    connectorId: string;
    signal: AbortSignal;
    responseLanguage: string;
  }) => {
    const response$ = await chat('generate_title', {
      messages: [
        {
          '@timestamp': new Date().toString(),
          message: {
            role: MessageRole.System,
            content: `You are a helpful assistant for Elastic Observability. Assume the following message is the start of a conversation between you and a user; give this conversation a title based on the content below. DO NOT UNDER ANY CIRCUMSTANCES wrap this title in single or double quotes. This title is shown in a list of conversations to the user, so title it for the user, not for you. Please create the title in ${responseLanguage}.`,
          },
        },
        {
          '@timestamp': new Date().toISOString(),
          message: {
            role: MessageRole.User,
            content: messages.slice(1).reduce((acc, curr) => {
              return `${acc} ${curr.message.role}: ${curr.message.content}`;
            }, 'Generate a title, using the title_conversation_function, based on the following conversation:\n\n'),
          },
        },
      ],
      functions: [
        {
          name: 'title_conversation',
          description:
            'Use this function to title the conversation. Do not wrap the title in quotes',
          parameters: {
            type: 'object',
            properties: {
              title: {
                type: 'string',
              },
            },
            required: ['title'],
          },
        },
      ],
      connectorId,
      signal,
    });

    const response = await lastValueFrom(response$.pipe(concatenateChatCompletionChunks()));

    const input =
      (response.message.function_call.name
        ? JSON.parse(response.message.function_call.arguments).title
        : response.message?.content) || '';

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
    categories,
  }: {
    queries: string[];
    categories?: string[];
  }): Promise<{ entries: RecalledEntry[] }> => {
    return this.dependencies.knowledgeBaseService.recall({
      namespace: this.dependencies.namespace,
      user: this.dependencies.user,
      queries,
      categories,
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

  private resolveInstructions = async (requestInstructions: Array<string | UserInstruction>) => {
    const knowledgeBaseInstructions = await this.dependencies.knowledgeBaseService.getInstructions(
      this.dependencies.user,
      this.dependencies.namespace
    );

    if (requestInstructions.length + knowledgeBaseInstructions.length === 0) {
      return '';
    }

    const priorityInstructions = requestInstructions.map((instruction) =>
      typeof instruction === 'string' ? { doc_id: v4(), text: instruction } : instruction
    );
    const overrideIds = priorityInstructions.map((instruction) => instruction.doc_id);
    const instructions = priorityInstructions.concat(
      knowledgeBaseInstructions.filter((instruction) => !overrideIds.includes(instruction.doc_id))
    );

    const instructionsWithinBudget = withTokenBudget(instructions, 1000);

    const instructionsPrompt = `What follows is a set of instructions provided by the user, please abide by them as long as they don't conflict with anything you've been told so far:\n`;

    return `${instructionsPrompt}${instructionsWithinBudget.join('\n\n')}`;
  };
}
