/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  BufferFlushEvent,
  ChatCompletionChunkEvent,
  ChatCompletionErrorCode,
  ChatCompletionErrorEvent,
  concatenateChatCompletionChunks,
  ConversationCreateEvent,
  FunctionDefinition,
  isChatCompletionError,
  MessageAddEvent,
  StreamingChatResponseEvent,
  StreamingChatResponseEventType,
} from '@kbn/observability-ai-assistant-plugin/common';
import type { ObservabilityAIAssistantScreenContext } from '@kbn/observability-ai-assistant-plugin/common/types';
import { throwSerializedChatCompletionErrors } from '@kbn/observability-ai-assistant-plugin/common/utils/throw_serialized_chat_completion_errors';
import {
  APIReturnType,
  isSupportedConnectorType,
  Message,
  MessageRole,
  ObservabilityAIAssistantAPIClientRequestParamsOf,
} from '@kbn/observability-ai-assistant-plugin/public';
import { streamIntoObservable } from '@kbn/observability-ai-assistant-plugin/server';
import { ToolingLog } from '@kbn/tooling-log';
import axios, { AxiosInstance, AxiosResponse, isAxiosError } from 'axios';
import { isArray, pick, remove } from 'lodash';
import pRetry from 'p-retry';
import {
  concatMap,
  defer,
  filter,
  from,
  lastValueFrom,
  of,
  OperatorFunction,
  retry,
  switchMap,
  timer,
  toArray,
} from 'rxjs';
import { format, parse, UrlObject } from 'url';
import { inspect } from 'util';
import { EvaluationResult } from './types';

// eslint-disable-next-line spaced-comment
/// <reference types="@kbn/ambient-ftr-types"/>

type InnerMessage = Message['message'];
type StringOrMessageList = string | InnerMessage[];

interface Options {
  screenContexts?: ObservabilityAIAssistantScreenContext[];
}

type CompleteFunction = (
  ...args:
    | [StringOrMessageList]
    | [StringOrMessageList, Options]
    | [string, StringOrMessageList]
    | [string, StringOrMessageList, Options]
) => Promise<{ conversationId?: string; messages: InnerMessage[] }>;

export interface ChatClient {
  chat: (message: StringOrMessageList) => Promise<InnerMessage>;
  complete: CompleteFunction;

  evaluate: (
    {}: { conversationId?: string; messages: InnerMessage[] },
    criteria: string[]
  ) => Promise<EvaluationResult>;
  getResults: () => EvaluationResult[];
  onResult: (cb: (result: EvaluationResult) => void) => () => void;
}

export class KibanaClient {
  axios: AxiosInstance;
  constructor(
    private readonly log: ToolingLog,
    private readonly url: string,
    private readonly spaceId?: string
  ) {
    this.axios = axios.create({
      headers: {
        'kbn-xsrf': 'foo',
      },
    });
  }

  private getUrl(props: { query?: UrlObject['query']; pathname: string }) {
    const parsed = parse(this.url);

    const baseUrl = parsed.pathname?.replaceAll('/', '') ?? '';

    const url = format({
      ...parsed,
      pathname: `/${[
        baseUrl,
        ...(this.spaceId ? ['s', this.spaceId] : []),
        props.pathname.startsWith('/') ? props.pathname.substring(1) : props.pathname,
      ].join('/')}`,
      query: props.query,
    });

    return url;
  }

  callKibana<T>(
    method: string,
    props: { query?: UrlObject['query']; pathname: string },
    data?: any
  ) {
    const url = this.getUrl(props);
    return this.axios<T>({
      method,
      url,
      data: data || {},
      headers: {
        'kbn-xsrf': 'true',
        'x-elastic-internal-origin': 'foo',
      },
    });
  }

  async installKnowledgeBase() {
    this.log.debug('Checking to see whether knowledge base is installed');

    const {
      data: { ready },
    } = await this.callKibana<{ ready: boolean }>('GET', {
      pathname: '/internal/observability_ai_assistant/kb/status',
    });

    if (ready) {
      this.log.info('Knowledge base is installed');
      return;
    }

    if (!ready) {
      this.log.info('Installing knowledge base');
    }

    await pRetry(
      async () => {
        const response = await this.callKibana<{}>('POST', {
          pathname: '/internal/observability_ai_assistant/kb/setup',
        });
        this.log.info('Knowledge base is ready');
        return response.data;
      },
      { retries: 10 }
    );

    this.log.info('Knowledge base installed');
  }

  createChatClient({
    connectorId,
    evaluationConnectorId,
    persist,
    suite,
  }: {
    connectorId: string;
    evaluationConnectorId: string;
    persist: boolean;
    suite: Mocha.Suite;
  }): ChatClient {
    function getMessages(message: string | Array<Message['message']>): Array<Message['message']> {
      if (typeof message === 'string') {
        return [
          {
            content: message,
            role: MessageRole.User,
          },
        ];
      }
      return message;
    }

    const that = this;

    async function getFunctions() {
      const {
        data: { functionDefinitions },
      }: AxiosResponse<APIReturnType<'GET /internal/observability_ai_assistant/functions'>> =
        await that.axios.get(
          that.getUrl({ pathname: '/internal/observability_ai_assistant/functions' })
        );

      return { functionDefinitions };
    }

    let currentTitle: string = '';

    suite.beforeEach(function () {
      const currentTest: Mocha.Test = this.currentTest;
      const titles: string[] = [];
      titles.push(this.currentTest.title);
      let parent = currentTest.parent;
      while (parent) {
        titles.push(parent.title);
        parent = parent.parent;
      }
      currentTitle = titles.reverse().join(' ');
    });

    suite.afterEach(function () {
      currentTitle = '';
    });

    const onResultCallbacks: Array<{
      callback: (result: EvaluationResult) => void;
      unregister: () => void;
    }> = [];

    function serializeAndHandleRetryableErrors<
      T extends StreamingChatResponseEvent
    >(): OperatorFunction<Buffer, Exclude<T, ChatCompletionErrorEvent>> {
      return (source$) => {
        const processed$ = source$.pipe(
          concatMap((buffer: Buffer) =>
            buffer
              .toString('utf-8')
              .split('\n')
              .map((line) => line.trim())
              .filter(Boolean)
              .map((line) => JSON.parse(line) as T | BufferFlushEvent)
          ),
          throwSerializedChatCompletionErrors(),
          retry({
            count: 1,
            delay: (error) => {
              that.log.error('Error in stream');

              if (isAxiosError(error)) {
                that.log.error(
                  inspect(
                    {
                      message: error.message,
                      status: error.status,
                      response: error.response?.data,
                    },
                    { depth: 10 }
                  )
                );
              } else {
                that.log.error(inspect(error, { depth: 10 }));
              }

              if (
                isChatCompletionError(error) &&
                error.code !== ChatCompletionErrorCode.InternalError
              ) {
                that.log.info(`Not retrying error ${error.code}`);
                return of();
              }
              that.log.info(`Retrying in 5s`);
              return timer(5000);
            },
          }),
          filter(
            (event): event is Exclude<T, ChatCompletionErrorEvent> =>
              event.type !== StreamingChatResponseEventType.BufferFlush
          )
        );

        return processed$;
      };
    }

    async function chat(
      name: string,
      {
        messages,
        functions,
        functionCall,
        connectorIdOverride,
      }: {
        messages: Message[];
        functions: FunctionDefinition[];
        functionCall?: string;
        connectorIdOverride?: string;
      }
    ) {
      that.log.info('Chat', name);

      const chat$ = defer(() => {
        that.log.debug(`Calling chat API`);
        const params: ObservabilityAIAssistantAPIClientRequestParamsOf<'POST /internal/observability_ai_assistant/chat'>['params']['body'] =
          {
            name,
            messages,
            connectorId: connectorIdOverride || connectorId,
            functions: functions.map((fn) => pick(fn, 'name', 'description', 'parameters')),
            functionCall,
          };

        return that.axios.post(
          that.getUrl({
            pathname: '/internal/observability_ai_assistant/chat',
          }),
          params,
          { responseType: 'stream', timeout: NaN }
        );
      }).pipe(
        switchMap((response) => streamIntoObservable(response.data)),
        serializeAndHandleRetryableErrors(),
        filter(
          (line): line is ChatCompletionChunkEvent =>
            line.type === StreamingChatResponseEventType.ChatCompletionChunk
        ),
        concatenateChatCompletionChunks()
      );

      const message = await lastValueFrom(chat$);

      return message.message;
    }

    const results: EvaluationResult[] = [];

    return {
      chat: async (message) => {
        const { functionDefinitions } = await getFunctions();
        const messages = [
          ...getMessages(message).map((msg) => ({
            message: msg,
            '@timestamp': new Date().toISOString(),
          })),
        ];
        return chat('chat', { messages, functions: functionDefinitions });
      },
      complete: async (...args) => {
        that.log.info(`Complete`);
        let messagesArg: StringOrMessageList;
        let conversationId: string | undefined;
        let options: Options = {};

        function isMessageList(arg: any): arg is StringOrMessageList {
          return isArray(arg) || typeof arg === 'string';
        }

        // | [StringOrMessageList]
        // | [StringOrMessageList, Options]
        // | [string, StringOrMessageList]
        // | [string, StringOrMessageList, Options]
        if (args.length === 1) {
          messagesArg = args[0];
        } else if (args.length === 2 && !isMessageList(args[1])) {
          messagesArg = args[0];
          options = args[1];
        } else if (args.length === 2 && typeof args[0] === 'string' && isMessageList(args[1])) {
          conversationId = args[0];
          messagesArg = args[1];
        } else if (args.length === 3) {
          conversationId = args[0];
          messagesArg = args[1];
          options = args[2];
        }

        const messages = [
          ...getMessages(messagesArg!).map((msg) => ({
            message: msg,
            '@timestamp': new Date().toISOString(),
          })),
        ];

        const stream$ = defer(() => {
          that.log.debug(`Calling /chat/complete API`);
          return from(
            that.axios.post(
              that.getUrl({
                pathname: '/internal/observability_ai_assistant/chat/complete',
              }),
              {
                screenContexts: options.screenContexts || [],
                conversationId,
                messages,
                connectorId,
                persist,
                title: currentTitle,
              },
              { responseType: 'stream', timeout: NaN }
            )
          );
        }).pipe(
          switchMap((response) => {
            return streamIntoObservable(response.data);
          }),
          serializeAndHandleRetryableErrors(),
          filter(
            (event): event is MessageAddEvent | ConversationCreateEvent =>
              event.type === StreamingChatResponseEventType.MessageAdd ||
              event.type === StreamingChatResponseEventType.ConversationCreate
          ),
          toArray()
        );

        const events = await lastValueFrom(stream$);

        return {
          messages: messages
            .map((msg) => msg.message)
            .concat(
              events
                .filter(
                  (event): event is MessageAddEvent =>
                    event.type === StreamingChatResponseEventType.MessageAdd
                )
                .map((event) => event.message.message)
            ),
          conversationId:
            conversationId ||
            events.find(
              (event): event is ConversationCreateEvent =>
                event.type === StreamingChatResponseEventType.ConversationCreate
            )?.conversation.id,
        };
      },
      evaluate: async ({ messages, conversationId }, criteria) => {
        const message = await chat('evaluate', {
          connectorIdOverride: evaluationConnectorId,
          messages: [
            {
              '@timestamp': new Date().toISOString(),
              message: {
                role: MessageRole.System,
                content: `You are a critical assistant for evaluating conversations with the Elastic Observability AI Assistant,
                which helps our users make sense of their Observability data.

                Your goal is to verify whether a conversation between the user and the assistant matches the given criteria.
                
                For each criterion, calculate a score. Explain your score, by describing what the assistant did right, and describing and quoting what the
                assistant did wrong, where it could improve, and what the root cause was in case of a failure.`,
              },
            },
            {
              '@timestamp': new Date().toString(),
              message: {
                role: MessageRole.User,
                content: `Evaluate the conversation according to the following criteria:
                
                ${criteria.map((criterion, index) => {
                  return `${index}: ${criterion}`;
                })}
                
                This is the conversation:
                
                ${JSON.stringify(
                  messages.map((msg) => pick(msg, 'content', 'name', 'function_call', 'role'))
                )}`,
              },
            },
          ],
          functions: [
            {
              name: 'scores',
              parameters: {
                type: 'object',
                properties: {
                  criteria: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        index: {
                          type: 'number',
                          description: 'The number of the criterion',
                        },
                        score: {
                          type: 'number',
                          description:
                            'A score of either 0 (criterion failed) or 1 (criterion succeeded)',
                        },
                        reasoning: {
                          type: 'string',
                          description:
                            'Your reasoning for the score. Explain your score by mentioning what you expected to happen and what did happen.',
                        },
                      },
                      required: ['index', 'score', 'reasoning'],
                    },
                  },
                },
                required: ['criteria'],
              },
              description: 'Call this function to return scores for the criteria',
            },
          ],
          functionCall: 'scores',
        });

        const scoredCriteria = (
          JSON.parse(message.function_call!.arguments!) as {
            criteria: Array<{ index: number; score: number; reasoning: string }>;
          }
        ).criteria;

        const result: EvaluationResult = {
          name: currentTitle,
          conversationId,
          messages,
          passed: scoredCriteria.every(({ score }) => score >= 1),
          scores: scoredCriteria.map(({ index, score, reasoning }) => {
            return {
              criterion: criteria[index],
              score,
              reasoning,
            };
          }),
        };

        results.push(result);

        onResultCallbacks.forEach(({ callback }) => {
          callback(result);
        });

        return result;
      },
      getResults: () => results,
      onResult: (callback) => {
        const unregister = () => {
          remove(onResultCallbacks, { callback });
        };
        onResultCallbacks.push({ callback, unregister });
        return unregister;
      },
    };
  }

  async getConnectors() {
    const connectors: AxiosResponse<
      Array<{
        id: string;
        connector_type_id: string;
        name: string;
        is_preconfigured: boolean;
        is_deprecated: boolean;
        referenced_by_count: number;
      }>
    > = await axios.get(
      this.getUrl({
        pathname: '/api/actions/connectors',
      })
    );

    return connectors.data.filter((connector) =>
      isSupportedConnectorType(connector.connector_type_id)
    );
  }
}
