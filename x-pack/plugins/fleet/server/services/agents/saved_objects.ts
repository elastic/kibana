/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { SavedObject } from '@kbn/core/server';

import type {
  Agent,
  AgentSOAttributes,
  AgentAction,
  AgentPolicyAction,
  AgentActionSOAttributes,
  AgentPolicyActionSOAttributes,
  BaseAgentActionSOAttributes,
} from '../../types';

export function savedObjectToAgent(so: SavedObject<AgentSOAttributes>): Agent {
  if (so.error) {
    throw new Error(so.error.message);
  }

  return {
    id: so.id,
    ...so.attributes,
    local_metadata: so.attributes.local_metadata,
    user_provided_metadata: so.attributes.user_provided_metadata,
    access_api_key: undefined,
    status: undefined,
    packages: so.attributes.packages ?? [],
  };
}

export function savedObjectToAgentAction(so: SavedObject<AgentActionSOAttributes>): AgentAction;
export function savedObjectToAgentAction(
  so: SavedObject<AgentPolicyActionSOAttributes>
): AgentPolicyAction;
export function savedObjectToAgentAction(
  so: SavedObject<BaseAgentActionSOAttributes>
): AgentAction | AgentPolicyAction {
  if (so.error) {
    if (so.error.statusCode === 404) {
      throw Boom.notFound(so.error.message);
    }

    throw new Error(so.error.message);
  }

  // If it's an AgentPolicyAction
  if (isPolicyActionSavedObject(so)) {
    return {
      id: so.id,
      type: so.attributes.type,
      created_at: so.attributes.created_at,
      policy_id: so.attributes.policy_id,
      policy_revision: so.attributes.policy_revision,
      data: so.attributes.data ? JSON.parse(so.attributes.data) : undefined,
      ack_data: so.attributes.ack_data ? JSON.parse(so.attributes.ack_data) : undefined,
    };
  }

  if (!isAgentActionSavedObject(so)) {
    throw new Error(`Malformed saved object AgentAction ${so.id}`);
  }

  // If it's an AgentAction
  return {
    id: so.id,
    type: so.attributes.type,
    created_at: so.attributes.created_at,
    agent_id: so.attributes.agent_id,
    data: so.attributes.data ? JSON.parse(so.attributes.data) : undefined,
    ack_data: so.attributes.ack_data ? JSON.parse(so.attributes.ack_data) : undefined,
  };
}

export function isAgentActionSavedObject(
  so: SavedObject<BaseAgentActionSOAttributes>
): so is SavedObject<AgentActionSOAttributes> {
  return (so.attributes as AgentActionSOAttributes).agent_id !== undefined;
}

export function isPolicyActionSavedObject(
  so: SavedObject<BaseAgentActionSOAttributes>
): so is SavedObject<AgentPolicyActionSOAttributes> {
  return (so.attributes as AgentPolicyActionSOAttributes).policy_id !== undefined;
}
