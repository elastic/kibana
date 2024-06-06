/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import { notFound } from '@hapi/boom';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { ElasticsearchClient, IUiSettingsClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { PublicMethodsOf } from '@kbn/utility-types';
import { SpanKind, context } from '@opentelemetry/api';
import { merge, omit } from 'lodash';
import {
  catchError,
  combineLatest,
  defer,
  filter,
  forkJoin,
  from,
  map,
  merge as mergeOperator,
  Observable,
  of,
  shareReplay,
  switchMap,
  tap,
  throwError,
} from 'rxjs';
import { Readable } from 'stream';
import { v4 } from 'uuid';
import { ObservabilityAIAssistantConnectorType } from '../../../common/connectors';
import {
  ChatCompletionChunkEvent,
  ChatCompletionErrorEvent,
  ConversationCreateEvent,
  ConversationUpdateEvent,
  createConversationNotFoundError,
  createInternalServerError,
  createTokenLimitReachedError,
  StreamingChatResponseEventType,
  TokenCountEvent,
  type StreamingChatResponseEvent,
} from '../../../common/conversation_complete';
import { CompatibleJSONSchema } from '../../../common/functions/types';
import {
  UserInstruction,
  type Conversation,
  type ConversationCreateRequest,
  type ConversationUpdateRequest,
  type KnowledgeBaseEntry,
  type Message,
} from '../../../common/types';
import { withoutTokenCountEvents } from '../../../common/utils/without_token_count_events';
import { CONTEXT_FUNCTION_NAME } from '../../functions/context';
import type { ChatFunctionClient } from '../chat_function_client';
import {
  KnowledgeBaseEntryOperationType,
  KnowledgeBaseService,
  RecalledEntry,
} from '../knowledge_base_service';
import type { ObservabilityAIAssistantResourceNames } from '../types';
import { getAccessQuery } from '../util/get_access_query';
import { getSystemMessageFromInstructions } from '../util/get_system_message_from_instructions';
import { replaceSystemMessage } from '../util/replace_system_message';
import { withAssistantSpan } from '../util/with_assistant_span';
import { createBedrockClaudeAdapter } from './adapters/bedrock/bedrock_claude_adapter';
import { failOnNonExistingFunctionCall } from './adapters/fail_on_non_existing_function_call';
import { createOpenAiAdapter } from './adapters/openai_adapter';
import { LlmApiAdapter } from './adapters/types';
import { getContextFunctionRequestIfNeeded } from './get_context_function_request_if_needed';
import { LangTracer } from './instrumentation/lang_tracer';
import { continueConversation } from './operators/continue_conversation';
import { extractMessages } from './operators/extract_messages';
import { extractTokenCount } from './operators/extract_token_count';
import { getGeneratedTitle } from './operators/get_generated_title';
import { instrumentAndCountTokens } from './operators/instrument_and_count_tokens';
import {
  LangtraceServiceProvider,
  withLangtraceChatCompleteSpan,
} from './operators/with_langtrace_chat_complete_span';

const MAX_FUNCTION_CALLS = 8;

export class ObservabilityAIAssistantClient {
  constructor(
    private readonly dependencies: {
      actionsClient: PublicMethodsOf<ActionsClient>;
      uiSettingsClient: IUiSettingsClient;
      namespace: string;
      esClient: {
        asInternalUser: ElasticsearchClient;
        asCurrentUser: ElasticsearchClient;
      };
      resources: ObservabilityAIAssistantResourceNames;
      logger: Logger;
      user?: {
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
    isPublic?: boolean;
    kibanaPublicUrl?: string;
    instructions?: Array<string | UserInstruction>;
    simulateFunctionCalling?: boolean;
    disableFunctions?: boolean;
  }): Observable<Exclude<StreamingChatResponseEvent, ChatCompletionErrorEvent>> => {
    return new LangTracer(context.active()).startActiveSpan(
      'complete',
      ({ tracer: completeTracer }) => {
        const {
          functionClient,
          connectorId,
          simulateFunctionCalling,
          instructions: requestInstructions = [],
          messages: initialMessages,
          signal,
          responseLanguage = 'English',
          persist,
          kibanaPublicUrl,
          isPublic,
          title: predefinedTitle,
          conversationId: predefinedConversationId,
          disableFunctions = false,
        } = params;

        if (responseLanguage) {
          requestInstructions.push(
            `You MUST respond in the users preferred language which is: ${responseLanguage}.`
          );
        }

        const isConversationUpdate = persist && !!predefinedConversationId;

        const conversationId = persist ? predefinedConversationId || v4() : '';

        if (persist && !isConversationUpdate && kibanaPublicUrl) {
          requestInstructions.push(
            `This conversation will be persisted in Kibana and available at this url: ${
              kibanaPublicUrl + `/app/observabilityAIAssistant/conversations/${conversationId}`
            }.`
          );
        }

        const kbInstructions$ = from(this.fetchKnowledgeBaseInstructions()).pipe(shareReplay());

        // from the initial messages, override any system message with
        // the one that is based on the instructions (registered, request, kb)
        const messagesWithUpdatedSystemMessage$ = kbInstructions$.pipe(
          map((knowledgeBaseInstructions) => {
            // this is what we eventually store in the conversation
            const messagesWithUpdatedSystemMessage = replaceSystemMessage(
              getSystemMessageFromInstructions({
                registeredInstructions: functionClient.getInstructions(),
                knowledgeBaseInstructions,
                requestInstructions,
                availableFunctionNames: functionClient
                  .getFunctions()
                  .map((fn) => fn.definition.name),
              }),
              initialMessages
            );

            return messagesWithUpdatedSystemMessage;
          }),
          shareReplay()
        );

        // if it is:
        // - a new conversation
        // - no predefined title is given
        // - we need to store the conversation
        // we generate a title
        // if not, we complete with an empty string
        const title$ =
          predefinedTitle || isConversationUpdate || !persist
            ? of(predefinedTitle || '').pipe(shareReplay())
            : messagesWithUpdatedSystemMessage$.pipe(
                switchMap((messages) =>
                  getGeneratedTitle({
                    messages,
                    responseLanguage,
                    logger: this.dependencies.logger,
                    chat: (name, chatParams) => {
                      return this.chat(name, {
                        ...chatParams,
                        simulateFunctionCalling,
                        connectorId,
                        signal,
                      });
                    },
                    tracer: completeTracer,
                  })
                ),
                shareReplay()
              );

        // we continue the conversation here, after resolving both the materialized
        // messages and the knowledge base instructions
        const nextEvents$ = combineLatest([
          messagesWithUpdatedSystemMessage$,
          kbInstructions$,
        ]).pipe(
          switchMap(([messagesWithUpdatedSystemMessage, knowledgeBaseInstructions]) => {
            // if needed, inject a context function request here
            const contextRequest = functionClient.hasFunction(CONTEXT_FUNCTION_NAME)
              ? getContextFunctionRequestIfNeeded(messagesWithUpdatedSystemMessage)
              : undefined;

            return mergeOperator(
              // if we have added a context function request, also emit
              // the messageAdd event for it, so we can notify the consumer
              // and add it to the conversation
              ...(contextRequest ? [of(contextRequest)] : []),
              continueConversation({
                messages: [
                  ...messagesWithUpdatedSystemMessage,
                  ...(contextRequest ? [contextRequest.message] : []),
                ],
                chat: (name, chatParams) => {
                  // inject a chat function with predefined parameters
                  return this.chat(name, {
                    ...chatParams,
                    signal,
                    simulateFunctionCalling,
                    connectorId,
                  });
                },
                // start out with the max number of function calls
                functionCallsLeft: MAX_FUNCTION_CALLS,
                functionClient,
                knowledgeBaseInstructions,
                requestInstructions,
                signal,
                logger: this.dependencies.logger,
                disableFunctions,
                tracer: completeTracer,
              })
            );
          }),
          shareReplay()
        );

        const output$ = mergeOperator(
          // get all the events from continuing the conversation
          nextEvents$,
          // wait until all dependencies have completed
          forkJoin([
            messagesWithUpdatedSystemMessage$,
            // get just the new messages
            nextEvents$.pipe(withoutTokenCountEvents(), extractMessages()),
            // count all the token count events emitted during completion
            mergeOperator(
              nextEvents$,
              title$.pipe(filter((value): value is TokenCountEvent => typeof value !== 'string'))
            ).pipe(extractTokenCount()),
            // get just the title, and drop the token count events
            title$.pipe(filter((value): value is string => typeof value === 'string')),
          ]).pipe(
            switchMap(
              ([messagesWithUpdatedSystemMessage, addedMessages, tokenCountResult, title]) => {
                const initialMessagesWithAddedMessages =
                  messagesWithUpdatedSystemMessage.concat(addedMessages);

                const lastMessage =
                  initialMessagesWithAddedMessages[initialMessagesWithAddedMessages.length - 1];

                // if a function request is at the very end, close the stream to consumer
                // without persisting or updating the conversation. we need to wait
                // on the function response to have a valid conversation
                const isFunctionRequest = lastMessage.message.function_call?.name;

                if (!persist || isFunctionRequest) {
                  return of();
                }

                if (isConversationUpdate) {
                  return from(this.getConversationWithMetaFields(conversationId))
                    .pipe(
                      switchMap((conversation) => {
                        if (!conversation) {
                          return throwError(() => createConversationNotFoundError());
                        }

                        const persistedTokenCount = conversation._source?.conversation
                          .token_count ?? {
                          prompt: 0,
                          completion: 0,
                          total: 0,
                        };

                        return from(
                          this.update(
                            conversationId,

                            merge(
                              {},

                              // base conversation without messages
                              omit(conversation._source, 'messages'),

                              // update messages
                              { messages: initialMessagesWithAddedMessages },

                              // update token count
                              {
                                conversation: {
                                  title: title || conversation._source?.conversation.title,
                                  token_count: {
                                    prompt: persistedTokenCount.prompt + tokenCountResult.prompt,
                                    completion:
                                      persistedTokenCount.completion + tokenCountResult.completion,
                                    total: persistedTokenCount.total + tokenCountResult.total,
                                  },
                                },
                              }
                            )
                          )
                        );
                      })
                    )
                    .pipe(
                      map((conversation): ConversationUpdateEvent => {
                        return {
                          conversation: conversation.conversation,
                          type: StreamingChatResponseEventType.ConversationUpdate,
                        };
                      })
                    );
                }

                return from(
                  this.create({
                    '@timestamp': new Date().toISOString(),
                    conversation: {
                      title,
                      id: conversationId,
                      token_count: tokenCountResult,
                    },
                    public: !!isPublic,
                    labels: {},
                    numeric_labels: {},
                    messages: initialMessagesWithAddedMessages,
                  })
                ).pipe(
                  map((conversation): ConversationCreateEvent => {
                    return {
                      conversation: conversation.conversation,
                      type: StreamingChatResponseEventType.ConversationCreate,
                    };
                  })
                );
              }
            )
          )
        );

        return output$.pipe(
          instrumentAndCountTokens('complete'),
          withoutTokenCountEvents(),
          catchError((error) => {
            this.dependencies.logger.error(error);
            return throwError(() => error);
          }),
          tap((event) => {
            if (this.dependencies.logger.isLevelEnabled('debug')) {
              switch (event.type) {
                case StreamingChatResponseEventType.MessageAdd:
                  this.dependencies.logger.debug(`Added message: ${JSON.stringify(event.message)}`);
                  break;

                case StreamingChatResponseEventType.ConversationCreate:
                  this.dependencies.logger.debug(
                    `Created conversation: ${JSON.stringify(event.conversation)}`
                  );
                  break;

                case StreamingChatResponseEventType.ConversationUpdate:
                  this.dependencies.logger.debug(
                    `Updated conversation: ${JSON.stringify(event.conversation)}`
                  );
                  break;
              }
            }
          }),
          shareReplay()
        );
      }
    );
  };

  chat = (
    name: string,
    {
      messages,
      connectorId,
      functions,
      functionCall,
      signal,
      simulateFunctionCalling,
      tracer,
    }: {
      messages: Message[];
      connectorId: string;
      functions?: Array<{ name: string; description: string; parameters?: CompatibleJSONSchema }>;
      functionCall?: string;
      signal: AbortSignal;
      simulateFunctionCalling?: boolean;
      tracer: LangTracer;
    }
  ): Observable<ChatCompletionChunkEvent | TokenCountEvent> => {
    return defer(() =>
      from(
        withAssistantSpan('get_connector', () =>
          this.dependencies.actionsClient.get({ id: connectorId, throwIfSystemAction: true })
        )
      )
    ).pipe(
      switchMap((connector) => {
        this.dependencies.logger.debug(`Creating "${connector.actionTypeId}" adapter`);

        let adapter: LlmApiAdapter;

        switch (connector.actionTypeId) {
          case ObservabilityAIAssistantConnectorType.OpenAI:
            adapter = createOpenAiAdapter({
              messages,
              functions,
              functionCall,
              logger: this.dependencies.logger,
              simulateFunctionCalling,
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

        this.dependencies.logger.trace(JSON.stringify(subAction.subActionParams, null, 2));

        return from(
          withAssistantSpan('get_execute_result', () =>
            this.dependencies.actionsClient.execute({
              actionId: connectorId,
              params: subAction,
            })
          )
        ).pipe(
          switchMap((executeResult) => {
            if (executeResult.status === 'error' && executeResult?.serviceMessage) {
              const tokenLimitRegex =
                /This model's maximum context length is (\d+) tokens\. However, your messages resulted in (\d+) tokens/g;
              const tokenLimitRegexResult = tokenLimitRegex.exec(executeResult.serviceMessage);

              if (tokenLimitRegexResult) {
                const [, tokenLimit, tokenCount] = tokenLimitRegexResult;
                throw createTokenLimitReachedError(
                  parseInt(tokenLimit, 10),
                  parseInt(tokenCount, 10)
                );
              }
            }

            if (executeResult.status === 'error') {
              throw createInternalServerError(
                `${executeResult?.message} - ${executeResult?.serviceMessage}`
              );
            }

            const response = executeResult.data as Readable;

            signal.addEventListener('abort', () => response.destroy());

            return tracer.startActiveSpan(
              '/chat/completions',
              {
                kind: SpanKind.CLIENT,
              },
              ({ span }) => {
                return adapter.streamIntoObservable(response).pipe(
                  withLangtraceChatCompleteSpan({
                    span,
                    messages,
                    functions,
                    model: connector.name,
                    serviceProvider:
                      connector.actionTypeId === ObservabilityAIAssistantConnectorType.OpenAI
                        ? LangtraceServiceProvider.OpenAI
                        : LangtraceServiceProvider.Anthropic,
                  })
                );
              }
            );
          })
        );
      }),
      instrumentAndCountTokens(name),
      failOnNonExistingFunctionCall({ functions }),
      tap((event) => {
        if (
          event.type === StreamingChatResponseEventType.ChatCompletionChunk &&
          this.dependencies.logger.isLevelEnabled('trace')
        ) {
          this.dependencies.logger.trace(`Received chunk: ${JSON.stringify(event.message)}`);
        }
      }),
      shareReplay()
    );
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
        conversation: { id: conversation.conversation.id || v4() },
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
      uiSettingsClient: this.dependencies.uiSettingsClient,
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

  fetchKnowledgeBaseInstructions = async () => {
    const knowledgeBaseInstructions = await this.dependencies.knowledgeBaseService.getInstructions(
      this.dependencies.namespace,
      this.dependencies.user
    );

    return knowledgeBaseInstructions;
  };
}
