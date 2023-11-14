/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChatCompletionError as ChatCompletionErrorClass } from '../errors';
import { Message } from '../types';

export enum StreamingChatResponseEventType {
  ChatCompletionChunk = 'chatCompletionChunk',
  ConversationCreate = 'conversationCreate',
  ConversationUpdate = 'conversationUpdate',
  MessageAdd = 'messageAdd',
  ChatCompletionError = 'chatCompletionError',
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
    message: {
      content?: string;
      function_call?: {
        name?: string;
        args?: string;
      };
    };
  }
>;

type ConversationCreateEvent = StreamingChatResponseEventBase<
  StreamingChatResponseEventType.ConversationCreate,
  {
    conversation: {
      id: string;
    };
  }
>;

type ConversationUpdateEvent = StreamingChatResponseEventBase<
  StreamingChatResponseEventType.ConversationUpdate,
  {
    conversation: {
      id: string;
      title: string;
      last_updated: string;
    };
  }
>;

type MessageAddEvent = StreamingChatResponseEventBase<
  StreamingChatResponseEventType.MessageAdd,
  Message
>;

type ChatCompletionErrorEvent = StreamingChatResponseEventBase<
  StreamingChatResponseEventType.ChatCompletionError,
  typeof ChatCompletionErrorClass
>;

export type StreamingChatResponseEvent =
  | ChatCompletionChunkEvent
  | ConversationCreateEvent
  | ConversationUpdateEvent
  | MessageAddEvent
  | ChatCompletionErrorEvent;
