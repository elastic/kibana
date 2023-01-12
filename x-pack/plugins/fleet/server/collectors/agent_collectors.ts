/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClient, ElasticsearchClient } from '@kbn/core/server';

import { AGENTS_INDEX } from '../../common';
import * as AgentService from '../services/agents';
import { appContextService } from '../services';

export interface AgentUsage {
  total_enrolled: number;
  healthy: number;
  unhealthy: number;
  offline: number;
  inactive: number;
  unenrolled: number;
  total_all_statuses: number;
  updating: number;
}

export const getAgentUsage = async (
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
      inactive: 0,
      unenrolled: 0,
      total_all_statuses: 0,
      updating: 0,
    };
  }

  const { total, inactive, online, error, offline, updating, unenrolled } =
    await AgentService.getAgentStatusForAgentPolicy(esClient, soClient);
  return {
    total_enrolled: total,
    healthy: online,
    unhealthy: error,
    offline,
    inactive,
    unenrolled,
    total_all_statuses: total + unenrolled,
    updating,
  };
};

export interface AgentData {
  agents_per_version: Array<{
    version: string;
    count: number;
  }>;
  agent_checkin_status: {
    error: number;
    degraded: number;
  };
  agents_per_policy: number[];
}

const DEFAULT_AGENT_DATA = {
  agent_checkin_status: { error: 0, degraded: 0 },
  agents_per_policy: [],
  agents_per_version: [],
};

export const getAgentData = async (
  esClient: ElasticsearchClient,
  abortController: AbortController
): Promise<AgentData> => {
  try {
    const transformLastCheckinStatusBuckets = (resp: any) =>
      ((resp?.aggregations?.last_checkin_status as any).buckets ?? []).reduce(
        (acc: any, bucket: any) => {
          if (acc[bucket.key] !== undefined) acc[bucket.key] = bucket.doc_count;
          return acc;
        },
        { error: 0, degraded: 0 }
      );
    const response = await esClient.search(
      {
        index: AGENTS_INDEX,
        query: {
          bool: {
            filter: [
              {
                term: {
                  active: 'true',
                },
              },
            ],
          },
        },
        size: 0,
        aggs: {
          versions: {
            terms: { field: 'agent.version' },
          },
          last_checkin_status: {
            terms: { field: 'last_checkin_status' },
          },
          policies: {
            terms: { field: 'policy_id' },
          },
        },
      },
      { signal: abortController.signal }
    );
    const agentsPerVersion = ((response?.aggregations?.versions as any).buckets ?? []).map(
      (bucket: any) => ({ version: bucket.key, count: bucket.doc_count })
    );
    const statuses = transformLastCheckinStatusBuckets(response);

    const agentsPerPolicy = ((response?.aggregations?.policies as any).buckets ?? []).map(
      (bucket: any) => bucket.doc_count
    );

    return {
      agent_checkin_status: statuses,
      agents_per_policy: agentsPerPolicy,
      agents_per_version: agentsPerVersion,
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
