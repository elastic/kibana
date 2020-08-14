/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClient } from 'kibana/server';
import * as AgentService from '../services/agents';
export interface AgentUsage {
  total: number;
  online: number;
  error: number;
  offline: number;
}

export const getAgentUsage = async (soClient?: SavedObjectsClient): Promise<AgentUsage> => {
  // TODO: unsure if this case is possible at all.
  if (!soClient) {
    return {
      total: 0,
      online: 0,
      error: 0,
      offline: 0,
    };
  }
  const { total, online, error, offline } = await AgentService.getAgentStatusForConfig(soClient);
  return {
    total,
    online,
    error,
    offline,
  };
};
