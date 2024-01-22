/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/* eslint-disable max-classes-per-file*/
import { i18n } from '@kbn/i18n';
import { Message } from './types';

export enum StreamingChatResponseEventType {
  ChatCompletionChunk = 'chatCompletionChunk',
  ConversationCreate = 'conversationCreate',
  ConversationUpdate = 'conversationUpdate',
  MessageAdd = 'messageAdd',
  ConversationCompletionError = 'conversationCompletionError',
}

type StreamingChatResponseEventBase<
  TEventType extends StreamingChatResponseEventType,
  TData extends {}
> = {
  type: TEventType;
} & TData;

type ChatCompletionChunkEvent = StreamingChatResponseEventBase<
  StreamingChatResponseEventType.ChatCompletionChunk,
  {
    id: string;
    message: {
      content?: string;
      function_call?: {
        name?: string;
        arguments?: string;
      };
    };
  }
>;

export type ConversationCreateEvent = StreamingChatResponseEventBase<
  StreamingChatResponseEventType.ConversationCreate,
  {
    conversation: {
      id: string;
      title: string;
      last_updated: string;
    };
  }
>;

export type ConversationUpdateEvent = StreamingChatResponseEventBase<
  StreamingChatResponseEventType.ConversationUpdate,
  {
    conversation: {
      id: string;
      title: string;
      last_updated: string;
    };
  }
>;

export type MessageAddEvent = StreamingChatResponseEventBase<
  StreamingChatResponseEventType.MessageAdd,
  { message: Message; id: string }
>;

export type ConversationCompletionErrorEvent = StreamingChatResponseEventBase<
  StreamingChatResponseEventType.ConversationCompletionError,
  { error: { message: string; stack?: string; code?: ChatCompletionErrorCode } }
>;

export type StreamingChatResponseEvent =
  | ChatCompletionChunkEvent
  | ConversationCreateEvent
  | ConversationUpdateEvent
  | MessageAddEvent
  | ConversationCompletionErrorEvent;

export enum ChatCompletionErrorCode {
  InternalError = 'internalError',
  NotFound = 'notFound',
}

export class ConversationCompletionError extends Error {
  code: ChatCompletionErrorCode;

  constructor(code: ChatCompletionErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

export class ConversationNotFoundError extends ConversationCompletionError {
  constructor() {
    super(
      ChatCompletionErrorCode.NotFound,
      i18n.translate(
        'xpack.observabilityAiAssistant.conversationCompletionError.conversationNotFound',
        {
          defaultMessage: 'Conversation not found',
        }
      )
    );
  }
}

export function isChatCompletionError(error: Error): error is ConversationCompletionError {
  return error instanceof ConversationCompletionError;
}
