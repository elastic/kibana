/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

export const Conversation = t.intersection([
  t.type({
    apiConfig: t.partial({
      connectorId: t.string,
      defaultSystemPromptId: t.string,
      provider: t.string,
      model: t.string,
    }),
    id: t.string,
    messages: t.array(
      t.intersection([
        t.type({
          role: t.string,
          content: t.string,
          timestamp: t.string,
        }),
        t.partial({
          presentation: t.partial({
            delay: t.number,
            stream: t.boolean,
          }),
        }),
      ])
    ),
  }),
  t.partial({
    replacements: t.record(t.string, t.string),
    theme: t.partial({
      title: t.string,
      titleIcon: t.string,
      user: t.partial({
        name: t.string,
        icon: t.string,
        id: t.string,
      }),
      assistant: t.partial({
        name: t.string,
        icon: t.string,
        id: t.string,
      }),
      system: t.partial({
        name: t.string,
        icon: t.string,
        id: t.string,
      }),
    }),
    isDefault: t.boolean,
    excludeFromLastConversationStorage: t.boolean,
  }),
]);

export const Conversations = t.record(t.string, Conversation);

export type Conversationss = t.TypeOf<typeof Conversations>;
export type Conversationn = t.TypeOf<typeof Conversation>;
