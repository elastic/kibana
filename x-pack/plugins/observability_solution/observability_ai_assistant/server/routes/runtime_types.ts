/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { toBooleanRt } from '@kbn/io-ts-utils';
import {
  type Conversation,
  type ConversationCreateRequest,
  type ConversationRequestBase,
  type ConversationUpdateRequest,
  type Message,
  MessageRole,
  type ObservabilityAIAssistantScreenContext,
} from '../../common/types';

const serializeableRt = t.any;

export const messageRt: t.Type<Message> = t.type({
  '@timestamp': t.string,
  message: t.intersection([
    t.type({
      role: t.union([
        t.literal(MessageRole.System),
        t.literal(MessageRole.Assistant),
        t.literal(MessageRole.Function),
        t.literal(MessageRole.User),
        t.literal(MessageRole.Elastic),
      ]),
    }),
    t.partial({
      content: t.string,
      name: t.string,
      event: t.string,
      function_call: t.intersection([
        t.type({
          name: t.string,
          trigger: t.union([
            t.literal(MessageRole.Assistant),
            t.literal(MessageRole.User),
            t.literal(MessageRole.Elastic),
          ]),
        }),
        t.partial({
          arguments: serializeableRt,
          data: serializeableRt,
        }),
      ]),
    }),
  ]),
});

export const baseConversationRt: t.Type<ConversationRequestBase> = t.type({
  '@timestamp': t.string,
  conversation: t.type({
    title: t.string,
  }),
  messages: t.array(messageRt),
  labels: t.record(t.string, t.string),
  numeric_labels: t.record(t.string, t.number),
  public: toBooleanRt,
});

export const conversationCreateRt: t.Type<ConversationCreateRequest> = t.intersection([
  baseConversationRt,
  t.type({
    conversation: t.type({
      title: t.string,
    }),
  }),
]);

export const conversationUpdateRt: t.Type<ConversationUpdateRequest> = t.intersection([
  baseConversationRt,
  t.type({
    conversation: t.type({
      id: t.string,
      title: t.string,
    }),
  }),
]);

export const conversationRt: t.Type<Conversation> = t.intersection([
  baseConversationRt,
  t.type({
    user: t.intersection([t.type({ name: t.string }), t.partial({ id: t.string })]),
    namespace: t.string,
    conversation: t.type({
      id: t.string,
      last_updated: t.string,
    }),
  }),
]);

export const screenContextRt: t.Type<ObservabilityAIAssistantScreenContext> = t.partial({
  description: t.string,
  data: t.array(
    t.type({
      name: t.string,
      description: t.string,
      value: t.any,
    })
  ),
});
