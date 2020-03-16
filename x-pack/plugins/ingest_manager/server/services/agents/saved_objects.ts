/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObject } from 'kibana/server';
import { Agent, AgentSOAttributes } from '../../types';

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
    local_metadata: JSON.parse(so.attributes.local_metadata),
    user_provided_metadata: JSON.parse(so.attributes.user_provided_metadata),
    access_api_key: undefined,
    status: undefined,
  };
}
