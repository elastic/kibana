/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { SavedObject } from 'src/core/server';
import { Agent, AgentSOAttributes, AgentAction, AgentActionSOAttributes } from '../../types';

export function savedObjectToAgent(so: SavedObject<AgentSOAttributes>): Agent {
  if (so.error) {
    throw new Error(so.error.message);
  }

  return {
    id: so.id,
    ...so.attributes,
    current_error_events: so.attributes.current_error_events
      ? JSON.parse(so.attributes.current_error_events)
      : [],
    local_metadata: so.attributes.local_metadata,
    user_provided_metadata: so.attributes.user_provided_metadata,
    access_api_key: undefined,
    status: undefined,
    packages: so.attributes.packages ?? [],
  };
}

export function savedObjectToAgentAction(so: SavedObject<AgentActionSOAttributes>): AgentAction {
  if (so.error) {
    if (so.error.statusCode === 404) {
      throw Boom.notFound(so.error.message);
    }

    throw new Error(so.error.message);
  }

  return {
    id: so.id,
    ...so.attributes,
    data: so.attributes.data ? JSON.parse(so.attributes.data) : undefined,
  };
}
