/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ElasticsearchClient, SavedObjectsClient } from 'kibana/server';
import * as AgentService from '../services/agents';
import { isFleetServerSetup } from '../services/fleet_server_migration';
export interface AgentUsage {
  total: number;
  online: number;
  error: number;
  offline: number;
}

export const getAgentUsage = async (
  soClient?: SavedObjectsClient,
  esClient?: ElasticsearchClient
): Promise<AgentUsage> => {
  // TODO: unsure if this case is possible at all.
  if (!soClient || !esClient || !(await isFleetServerSetup())) {
    return {
      total: 0,
      online: 0,
      error: 0,
      offline: 0,
    };
  }

  const { total, online, error, offline } = await AgentService.getAgentStatusForAgentPolicy(
    soClient,
    esClient
  );
  return {
    total,
    online,
    error,
    offline,
  };
};
