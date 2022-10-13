/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core/server';

import type { Agent, AgentSOAttributes } from '../../types';

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
