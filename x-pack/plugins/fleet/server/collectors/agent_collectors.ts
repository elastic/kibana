/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClient, ElasticsearchClient } from '@kbn/core/server';

import type { FleetConfigType } from '../../common/types';
import { AGENTS_INDEX } from '../../common';
import * as AgentService from '../services/agents';
import { appContextService } from '../services';

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

export interface AgentData {
  agent_versions: string[];
  agent_last_checkin_status: {
    error: number;
    degraded: number;
  };
}

const DEFAULT_AGENT_DATA = {
  agent_versions: [],
  agent_last_checkin_status: { error: 0, degraded: 0 },
};

export const getAgentData = async (esClient?: ElasticsearchClient): Promise<AgentData> => {
  if (!esClient) {
    return DEFAULT_AGENT_DATA;
  }
  try {
    const response = await esClient.search({
      index: AGENTS_INDEX,
      size: 0,
      aggs: {
        versions: {
          terms: { field: 'agent.version' },
        },
        last_checkin_status: {
          terms: { field: 'last_checkin_status' },
        },
      },
    });
    const versions = ((response?.aggregations?.versions as any).buckets ?? []).map(
      (bucket: any) => bucket.key
    );
    const statuses = ((response?.aggregations?.last_checkin_status as any).buckets ?? []).reduce(
      (acc: any, bucket: any) => {
        if (acc[bucket.key]) acc[bucket.key] = bucket.doc_count;
        return acc;
      },
      { error: 0, degraded: 0 }
    );
    return {
      agent_versions: versions,
      agent_last_checkin_status: statuses,
    };
  } catch (error) {
    if (error.statusCode === 404) {
      appContextService.getLogger().debug('Index .fleet-agents does not exist yet.');
    } else {
      throw error;
    }
    return DEFAULT_AGENT_DATA;
  }
};
