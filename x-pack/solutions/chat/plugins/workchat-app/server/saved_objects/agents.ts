/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsType } from '@kbn/core/server';

export const agentTypeName = 'workchat_agent' as const;

export const agentSoType: SavedObjectsType<AgentAttributes> = {
  // TODO: specific SO index for workchat
  name: agentTypeName,
  hidden: true,
  namespaceType: 'agnostic',
  mappings: {
    dynamic: false,
    properties: {
      agent_id: { type: 'keyword' },
      agent_name: { type: 'text' },
      description: { type: 'text' },
      last_updated: { type: 'date' },
      configuration: { dynamic: false, type: 'object', properties: {} },
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

export interface AgentAttributes {
  agent_id: string;
  agent_name: string;
  description: string;
  last_updated: string;
  configuration: Record<string, unknown>;
  user_id: string;
  user_name: string;
  access_control: {
    public: boolean;
  };
  avatar: {
    color?: string;
    text?: string;
  };
}
