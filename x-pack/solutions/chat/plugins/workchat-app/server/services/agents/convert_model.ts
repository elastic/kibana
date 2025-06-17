/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core/server';
import type { UserNameAndId } from '../../../common/shared';
import type { Agent, AgentCreateRequest } from '../../../common/agents';
import type { AgentAttributes } from '../../saved_objects/agents';
import type { AgentUpdatableFields } from './agent_client';

export const savedObjectToModel = ({ attributes }: SavedObject<AgentAttributes>): Agent => {
  return {
    id: attributes.agent_id,
    name: attributes.agent_name,
    description: attributes.description,
    lastUpdated: attributes.last_updated,
    user: {
      id: attributes.user_id,
      name: attributes.user_name,
    },
    configuration: attributes.configuration,
    public: attributes.access_control.public,
    avatar: {
      color: attributes.avatar?.color,
      text: attributes.avatar?.text,
    },
  };
};

export const updateToAttributes = ({
  updatedFields,
}: {
  updatedFields: AgentUpdatableFields;
}): Partial<AgentAttributes> => {
  return {
    agent_name: updatedFields.name,
    description: updatedFields.description,
    configuration: updatedFields.configuration,
    avatar: updatedFields.avatar,
  };
};

export const createRequestToRaw = ({
  createRequest,
  id,
  user,
  creationDate,
  color,
}: {
  createRequest: AgentCreateRequest;
  id: string;
  user: UserNameAndId;
  creationDate: Date;
  color: string;
}): AgentAttributes => {
  return {
    agent_id: id,
    agent_name: createRequest.name,
    description: createRequest.description,
    configuration: createRequest.configuration,
    last_updated: creationDate.toISOString(),
    user_id: user.id,
    user_name: user.name,
    access_control: {
      public: createRequest.public,
    },
    avatar: {
      color: color || createRequest.avatar.color,
      text: createRequest.avatar.text,
    },
  };
};
