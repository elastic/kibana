/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { CoreSetup } from '@kbn/core/server';

import { AGENTS_INDEX } from '../../../common';

import type { AgentPerVersion, AgentUsage } from '../../collectors/agent_collectors';
import { getAgentUsage } from '../../collectors/agent_collectors';
import { getInternalClients } from '../../collectors/helpers';
import { appContextService } from '../app_context';
import { retryTransientEsErrors } from '../epm/elasticsearch/retry';

export interface AgentMetrics {
  agents: AgentUsage;
  agents_per_version: AgentPerVersion[];
  upgrading_step: UpgradingSteps;
}

export interface UpgradingSteps {
  requested: number;
  scheduled: number;
  downloading: number;
  extracting: number;
  replacing: number;
  restarting: number;
  watching: number;
  rollback: number;
  failed: number;
}

export const fetchAgentMetrics = async (
  core: CoreSetup,
  abortController: AbortController
): Promise<AgentMetrics | undefined> => {
  const [soClient, esClient] = await getInternalClients(core);
  if (!soClient || !esClient) {
    return;
  }

  const fleetAgentsIndexExists = await esClient.indices.exists({
    index: AGENTS_INDEX,
  });

  if (!fleetAgentsIndexExists) {
    return;
  }

  const usage = {
    agents: await getAgentUsage(soClient, esClient),
    agents_per_version: await getAgentsPerVersion(esClient, abortController),
    upgrading_step: await getUpgradingSteps(esClient, abortController),
  };
  return usage;
};

export const getAgentsPerVersion = async (
  esClient: ElasticsearchClient,
  abortController: AbortController
): Promise<AgentPerVersion[]> => {
  try {
    const response = await retryTransientEsErrors(() =>
      esClient.search(
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
          },
        },
        { signal: abortController.signal }
      )
    );
    return ((response?.aggregations?.versions as any).buckets ?? []).map((bucket: any) => ({
      version: bucket.key,
      count: bucket.doc_count,
    }));
  } catch (error) {
    if (error.statusCode === 404) {
      appContextService.getLogger().debug('Index .fleet-agents does not exist yet.');
    } else {
      throw error;
    }
    return [];
  }
};

export const getUpgradingSteps = async (
  esClient: ElasticsearchClient,
  abortController: AbortController
): Promise<UpgradingSteps> => {
  const upgradingSteps = {
    requested: 0,
    scheduled: 0,
    downloading: 0,
    extracting: 0,
    replacing: 0,
    restarting: 0,
    watching: 0,
    rollback: 0,
    failed: 0,
  };
  try {
    const response = await retryTransientEsErrors(() =>
      esClient.search(
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
            upgrade_details: {
              terms: { field: 'upgrade_details.state' },
            },
          },
        },
        { signal: abortController.signal }
      )
    );
    ((response?.aggregations?.upgrade_details as any).buckets ?? []).forEach((bucket: any) => {
      switch (bucket.key) {
        case 'UPG_REQUESTED':
          upgradingSteps.requested = bucket.doc_count;
          break;
        case 'UPG_SCHEDULED':
          upgradingSteps.scheduled = bucket.doc_count;
          break;
        case 'UPG_DOWNLOADING':
          upgradingSteps.downloading = bucket.doc_count;
          break;
        case 'UPG_EXTRACTING':
          upgradingSteps.extracting = bucket.doc_count;
          break;
        case 'UPG_REPLACING':
          upgradingSteps.replacing = bucket.doc_count;
          break;
        case 'UPG_RESTARTING':
          upgradingSteps.restarting = bucket.doc_count;
          break;
        case 'UPG_WATCHING':
          upgradingSteps.watching = bucket.doc_count;
          break;
        case 'UPG_ROLLBACK':
          upgradingSteps.rollback = bucket.doc_count;
          break;
        case 'UPG_FAILED':
          upgradingSteps.failed = bucket.doc_count;
          break;
        default:
          break;
      }
    });
    return upgradingSteps;
  } catch (error) {
    if (error.statusCode === 404) {
      appContextService.getLogger().debug('Index .fleet-agents does not exist yet.');
    } else {
      throw error;
    }
    return upgradingSteps;
  }
};
