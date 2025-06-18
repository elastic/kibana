/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Message,
  ToolDefinition,
  ToolChoice,
  ToolCallsOf,
  withoutChunkEvents,
  withoutTokenCountEvents,
  ToolMessage,
  MessageOf,
  MessageRole,
} from '@kbn/inference-common';
import { InferenceClient } from '@kbn/inference-common';
import { Logger } from '@kbn/logging';
import {
  defer,
  last,
  merge,
  Observable,
  of,
  OperatorFunction,
  share,
  switchMap,
  toArray,
} from 'rxjs';

interface CallToolOptions extends CallToolTools {
  system: string;
  messages: Message[];
  inferenceClient: InferenceClient;
  connectorId: string;
  logger: Logger;
}

interface CallToolTools {
  tools: Record<string, ToolDefinition>;
  toolChoice?: ToolChoice;
}

type CallbackOf<
  TCallToolTools extends CallToolTools,
  TEmittedMessage extends Message
> = (parameters: {
  messages: Message[];
  toolCalls: ToolCallsOf<TCallToolTools>['toolCalls'];
}) => Observable<TEmittedMessage>;

type GetNextRequestCallback<TCallToolTools extends CallToolTools> = ({
  messages,
  system,
}: {
  messages: Message[];
  system: string;
}) => { system: string; messages: Message[] } & TCallToolTools;

export function callTools<TCallToolOptions extends CallToolOptions>(
  { system, messages, inferenceClient, connectorId, tools, toolChoice, logger }: TCallToolOptions,
  callback: CallbackOf<TCallToolOptions, ToolMessage>
): Observable<MessageOf<TCallToolOptions>>;

export function callTools<
  TCallToolOptions extends Omit<CallToolOptions, 'tools' | 'toolChoice'> = never,
  TCallToolTools extends CallToolTools = never,
  TEmittedMessage extends Message = never
>(
  options: TCallToolOptions,
  getNextRequest: GetNextRequestCallback<TCallToolTools>,
  callback: CallbackOf<TCallToolTools, TEmittedMessage>
): Observable<TEmittedMessage>;

export function callTools(
  { system, messages, inferenceClient, connectorId, tools, toolChoice, logger }: CallToolOptions,
  ...callbacks:
    | [GetNextRequestCallback<CallToolTools>, CallbackOf<CallToolOptions, ToolMessage>]
    | [CallbackOf<CallToolTools, ToolMessage>]
): Observable<Message> {
  const callback = callbacks.length === 2 ? callbacks[1] : callbacks[0];

  const getNextRequest =
    callbacks.length === 2
      ? callbacks[0]
      : (next: { messages: Message[]; system: string }) => {
          return {
            ...next,
            tools,
            toolChoice,
          };
        };

  const nextRequest = getNextRequest({ system, messages });

  const chatComplete$ = defer(() =>
    inferenceClient.chatComplete({
      connectorId,
      stream: true,
      ...nextRequest,
    })
  );

  const asCompletedMessages$ = chatComplete$.pipe(
    withoutChunkEvents(),
    withoutTokenCountEvents(),
    switchMap((event) => {
      return of({
        role: MessageRole.Assistant as const,
        content: event.content,
        toolCalls: event.toolCalls,
      });
    })
  );

  const withToolResponses$ = asCompletedMessages$
    .pipe(
      switchMap((message) => {
        if (message.toolCalls.length) {
          return merge(
            of(message),
            callback({ toolCalls: message.toolCalls, messages: messages.concat(message) })
          );
        }
        return of(message);
      })
    )
    .pipe(handleNext());

  return withToolResponses$;

  function handleNext(): OperatorFunction<Message, Message> {
    return (source$) => {
      const shared$ = source$.pipe(share());

      const next$ = merge(
        shared$,
        shared$.pipe(
          toArray(),
          last(),
          switchMap((nextMessages) => {
            logger.debug(() =>
              JSON.stringify(
                nextMessages.map((message) => {
                  return {
                    role: message.role,
                    toolCalls: 'toolCalls' in message ? message.toolCalls : undefined,
                    toolCallId: 'toolCallId' in message ? message.toolCallId : undefined,
                  };
                })
              )
            );

            if (nextMessages[nextMessages.length - 1].role !== MessageRole.Assistant) {
              const options: CallToolOptions = {
                system,
                connectorId,
                inferenceClient,
                messages: messages.concat(nextMessages),
                tools,
                toolChoice,
                logger,
              };
              const after$ = callTools(options, getNextRequest, callback);
              return after$;
            }
            return of();
          })
        )
      );

      return next$;
    };
  }
}
