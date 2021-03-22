/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClient } from 'kibana/server';
import type { ElasticsearchClient } from 'kibana/server';

import type { FleetConfigType } from '../../common/types';
import * as AgentService from '../services/agents';
import { isFleetServerSetup } from '../services/fleet_server';

export interface AgentUsage {
  total: number;
  online: number;
  error: number;
  offline: number;
}

export const getAgentUsage = async (
  config: FleetConfigType,
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
