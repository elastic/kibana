/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { pick, remove } from 'lodash';
import { filter, lastValueFrom, map, tap, toArray } from 'rxjs';
import { format, parse, UrlObject } from 'url';
import { Message, MessageRole } from '../../common';
import {
  ChatCompletionErrorCode,
  ConversationCompletionError,
  ConversationCreateEvent,
  MessageAddEvent,
  StreamingChatResponseEvent,
  StreamingChatResponseEventType,
} from '../../common/conversation_complete';
import { FunctionDefinition } from '../../common/types';
import { concatenateOpenAiChunks } from '../../common/utils/concatenate_openai_chunks';
import { processOpenAiStream } from '../../common/utils/process_openai_stream';
import { APIReturnType, ObservabilityAIAssistantAPIClientRequestParamsOf } from '../../public';
import { getAssistantSetupMessage } from '../../public/service/get_assistant_setup_message';
import { streamIntoObservable } from '../../server/service/util/stream_into_observable';
import { EvaluationResult } from './types';

type InnerMessage = Message['message'];
type StringOrMessageList = string | InnerMessage[];

export interface ChatClient {
  chat: (message: StringOrMessageList) => Promise<InnerMessage>;
  complete: (
    ...args: [StringOrMessageList] | [string, InnerMessage[]]
  ) => Promise<{ conversationId?: string; messages: InnerMessage[] }>;

  evaluate: (
    {}: { conversationId?: string; messages: InnerMessage[] },
    criteria: string[]
  ) => Promise<EvaluationResult>;
  getResults: () => EvaluationResult[];
  onResult: (cb: (result: EvaluationResult) => void) => () => void;
}

export class KibanaClient {
  axios: AxiosInstance;
  constructor(private readonly url: string, private readonly spaceId?: string) {
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

  createChatClient({
    connectorId,
    persist,
  }: {
    connectorId: string;
    persist: boolean;
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
        data: { functionDefinitions, contextDefinitions },
      }: AxiosResponse<APIReturnType<'GET /internal/observability_ai_assistant/functions'>> =
        await that.axios.get(
          that.getUrl({ pathname: '/internal/observability_ai_assistant/functions' })
        );

      return { functionDefinitions, contextDefinitions };
    }

    const onResultCallbacks: Array<{
      callback: (result: EvaluationResult) => void;
      unregister: () => void;
    }> = [];

    async function chat({
      messages,
      functions,
      functionCall,
    }: {
      messages: Message[];
      functions: FunctionDefinition[];
      functionCall?: string;
    }) {
      const params: ObservabilityAIAssistantAPIClientRequestParamsOf<'POST /internal/observability_ai_assistant/chat'>['params']['body'] =
        {
          messages,
          connectorId,
          functions: functions.map((fn) => pick(fn, 'name', 'description', 'parameters')),
          functionCall,
        };
      const stream$ = streamIntoObservable(
        (
          await that.axios.post(
            that.getUrl({
              pathname: '/internal/observability_ai_assistant/chat',
              query: { stream: true },
            }),
            params,
            { responseType: 'stream' }
          )
        ).data
      ).pipe(processOpenAiStream(), concatenateOpenAiChunks());

      const receivedMessage = await lastValueFrom(stream$);

      return receivedMessage.message;
    }

    const results: EvaluationResult[] = [];

    return {
      chat: async (message) => {
        const { functionDefinitions, contextDefinitions } = await getFunctions();
        const messages = [
          getAssistantSetupMessage({ contexts: contextDefinitions }),
          ...getMessages(message).map((msg) => ({
            message: msg,
            '@timestamp': new Date().toISOString(),
          })),
        ];
        return chat({ messages, functions: functionDefinitions });
      },
      complete: async (...args) => {
        const messagesArg = args.length === 1 ? args[0] : args[1];
        const conversationId = args.length === 1 ? undefined : args[0];
        const { contextDefinitions } = await getFunctions();
        const messages = [
          getAssistantSetupMessage({ contexts: contextDefinitions }),
          ...getMessages(messagesArg).map((msg) => ({
            message: msg,
            '@timestamp': new Date().toISOString(),
          })),
        ];

        const stream$ = streamIntoObservable(
          (
            await that.axios.post(
              that.getUrl({
                pathname: '/internal/observability_ai_assistant/chat/complete',
              }),
              {
                conversationId,
                messages,
                connectorId,
                persist,
              },
              { responseType: 'stream' }
            )
          ).data
        ).pipe(
          map((line) => JSON.parse(line) as StreamingChatResponseEvent),
          tap((event) => {
            if (event.type === StreamingChatResponseEventType.ConversationCompletionError) {
              throw new ConversationCompletionError(
                event.error.code ?? ChatCompletionErrorCode.InternalError,
                event.error.message
              );
            }
          }),
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
        const message = await chat({
          messages: [
            {
              '@timestamp': new Date().toISOString(),
              message: {
                role: MessageRole.System,
                content: `You are a critical assistant for evaluating conversations with the Elastic Observability AI Assistant,
                which helps our users make sense of their Observability data.

                Your goal is to verify whether a conversation between the user and the assistant matches the given criteria.
                
                For each criterion, calculate a score. Explain your score, by describing what the assistant did right, and what the
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
                
                ${JSON.stringify(messages)}`,
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
              contexts: [],
              description: 'Call this function to return scores for the criteria',
            },
          ],
          functionCall: 'scores',
        });

        const scoredCriteria = (
          JSON.parse(message.function_call.arguments) as {
            criteria: Array<{ index: number; score: number; reasoning: string }>;
          }
        ).criteria;

        const result: EvaluationResult = {
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

    return connectors.data.filter((connector) => connector.connector_type_id === '.gen-ai');
  }
}
