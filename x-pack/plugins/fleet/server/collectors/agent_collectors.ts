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
  healthy: number;
  unhealthy: number;
  offline: number;
  updating: number;
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
      healthy: 0,
      unhealthy: 0,
      offline: 0,
      updating: 0,
    };
  }

  const {
    total,
    online,
    error,
    offline,
    updating,
  } = await AgentService.getAgentStatusForAgentPolicy(soClient, esClient);
  return {
    total,
    healthy: online,
    unhealthy: error,
    offline,
    updating,
  };
};
