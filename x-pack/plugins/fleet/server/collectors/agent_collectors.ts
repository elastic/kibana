/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClient, ElasticsearchClient } from '@kbn/core/server';

import type { FleetConfigType } from '../../common/types';
import * as AgentService from '../services/agents';

export interface AgentUsage {
  total_enrolled: number;
  healthy: number;
  unhealthy: number;
  offline: number;
  total_all_statuses: number;
  updating: number;
}

export const getAgentUsage = async (
  config: FleetConfigType,
  soClient?: SavedObjectsClient,
  esClient?: ElasticsearchClient
): Promise<AgentUsage> => {
  // TODO: unsure if this case is possible at all.
  if (!soClient || !esClient) {
    return {
      total_enrolled: 0,
      healthy: 0,
      unhealthy: 0,
      offline: 0,
      total_all_statuses: 0,
      updating: 0,
    };
  }

  const { total, inactive, online, error, offline, updating } =
    await AgentService.getAgentStatusForAgentPolicy(esClient);
  return {
    total_enrolled: total,
    healthy: online,
    unhealthy: error,
    offline,
    total_all_statuses: total + inactive,
    updating,
  };
};
