/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsType } from '@kbn/core/server';
import type { ConversationEvent } from '../../common/conversation_events';

export const conversationTypeName = 'workchat_conversation' as const;

export const conversationSoType: SavedObjectsType<ConversationAttributes> = {
  // TODO: specific SO index for workchat
  name: conversationTypeName,
  hidden: true,
  namespaceType: 'agnostic',
  mappings: {
    dynamic: 'strict',
    properties: {
      conversation_id: { type: 'keyword' },
      agent_id: { type: 'keyword' },
      title: { type: 'text' },
      last_updated: { type: 'date' },

      events: { dynamic: false, type: 'object', properties: {} },

      user_id: { type: 'keyword' },
      user_name: { type: 'keyword' },

      access_control: {
        properties: {
          public: { type: 'boolean' },
        },
      },
    },
  },
};

export interface ConversationAttributes {
  conversation_id: string;
  agent_id: string;
  title: string;
  last_updated: string;

  user_id: string;
  user_name: string;

  events: ConversationEvent[];

  access_control: {
    public: boolean;
  };
}
