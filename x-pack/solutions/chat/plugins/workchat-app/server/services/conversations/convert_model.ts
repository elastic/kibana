/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core/server';
import type { Conversation, ConversationCreateRequest } from '../../../common/conversations';
import type { ConversationAttributes } from '../../saved_objects/conversations';
import type { ClientUser } from './types';
import type { ConversationUpdatableFields } from './conversation_client';

export const savedObjectToModel = ({
  attributes,
}: SavedObject<ConversationAttributes>): Conversation => {
  return {
    id: attributes.conversation_id,
    agentId: attributes.agent_id,
    title: attributes.title,
    lastUpdated: attributes.last_updated,
    user: {
      id: attributes.user_id,
      name: attributes.user_name,
    },
    events: attributes.events,
  };
};

export const updateToAttributes = ({
  updatedFields,
}: {
  updatedFields: ConversationUpdatableFields;
}): Partial<ConversationAttributes> => {
  return {
    title: updatedFields.title,
    events: updatedFields.events,
  };
};

export const createRequestToRaw = ({
  conversation,
  id,
  user,
  creationDate,
}: {
  conversation: ConversationCreateRequest;
  id: string;
  user: ClientUser;
  creationDate: Date;
}): ConversationAttributes => {
  return {
    conversation_id: id,
    agent_id: conversation.agentId,
    title: conversation.title,
    last_updated: creationDate.toISOString(),
    user_id: user.id,
    user_name: user.username,
    events: conversation.events,
    access_control: {
      public: false,
    },
  };
};
