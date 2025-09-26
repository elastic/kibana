/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UserNameAndId } from './shared';

/**
 * Represents an agent
 */
export interface Agent {
  id: string;
  name: string;
  description: string;
  lastUpdated: string;
  user: UserNameAndId;
  public: boolean;
  configuration: Record<string, any>;
  avatar: {
    color?: string;
    text?: string;
  };
}

export type AgentCreateRequest = Pick<
  Agent,
  'name' | 'description' | 'configuration' | 'public' | 'avatar'
> & {
  id?: string;
};
