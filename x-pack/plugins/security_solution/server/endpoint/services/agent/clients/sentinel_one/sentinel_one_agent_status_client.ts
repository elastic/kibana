/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_MAX_TABLE_QUERY_SIZE } from '../../../../../../common/constants';
import { catchAndWrapError } from '../../../../utils';
import { getPendingActionsSummary } from '../../..';
import type { RawSentinelOneInfo } from './types';
import { type AgentStatusRecords, HostStatus } from '../../../../../../common/endpoint/types';
import type { ResponseActionAgentType } from '../../../../../../common/endpoint/service/response_actions/constants';
import { AgentStatusClient } from '../lib/base_agent_status_client';
import { AgentStatusClientError } from '../errors';

const SENTINEL_ONE_AGENT_INDEX_PATTERN = `logs-sentinel_one.agent-*`;

enum SENTINEL_ONE_NETWORK_STATUS {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTING = 'disconnecting',
  DISCONNECTED = 'disconnected',
}

export class SentinelOneAgentStatusClient extends AgentStatusClient {
  protected readonly agentType: ResponseActionAgentType = 'sentinel_one';

  async getAgentStatuses(agentIds: string[]): Promise<AgentStatusRecords> {
    const esClient = this.options.esClient;
    const metadataService = this.options.endpointService.getEndpointMetadataService();
    const sortField = 'sentinel_one.agent.last_active_date';

    const query = {
      bool: {
        must: [
          {
            bool: {
              filter: [
                {
                  terms: {
                    'sentinel_one.agent.uuid': agentIds,
                  },
                },
              ],
            },
          },
        ],
      },
    };

    try {
      const [searchResponse, allPendingActions] = await Promise.all([
        esClient.search(
          {
            index: SENTINEL_ONE_AGENT_INDEX_PATTERN,
            from: 0,
            size: DEFAULT_MAX_TABLE_QUERY_SIZE,
            query,
            collapse: {
              field: 'sentinel_one.agent.uuid',
              inner_hits: {
                name: 'most_recent',
                size: 1,
                sort: [
                  {
                    [sortField]: {
                      order: 'desc',
                    },
                  },
                ],
              },
            },
            sort: [
              {
                [sortField]: {
                  order: 'desc',
                },
              },
            ],
            _source: false,
          },
          { ignore: [404] }
        ),

        getPendingActionsSummary(esClient, metadataService, this.log, agentIds),
      ]).catch(catchAndWrapError);

      const mostRecentAgentInfosByAgentId = searchResponse?.hits?.hits?.reduce<
        Record<string, RawSentinelOneInfo>
      >((acc, hit) => {
        if (hit.fields?.['sentinel_one.agent.uuid'][0]) {
          acc[hit.fields?.['sentinel_one.agent.uuid'][0]] =
            hit.inner_hits?.most_recent.hits.hits[0]._source;
        }

        return acc;
      }, {});

      return agentIds.reduce<AgentStatusRecords>((acc, agentId) => {
        const agentInfo = mostRecentAgentInfosByAgentId[agentId].sentinel_one.agent;

        const pendingActions = allPendingActions.find(
          (agentPendingActions) => agentPendingActions.agent_id === agentId
        );

        acc[agentId] = {
          agentId,
          agentType: this.agentType,
          found: agentInfo?.uuid === agentId,
          isolated: agentInfo?.network_status === SENTINEL_ONE_NETWORK_STATUS.DISCONNECTED,
          lastSeen: agentInfo?.last_active_date || '',
          status: agentInfo?.is_active
            ? HostStatus.HEALTHY
            : // If the agent is pending uninstall or uninstalled, we consider it unenrolled
            agentInfo?.is_pending_uninstall || agentInfo?.is_uninstalled
            ? HostStatus.UNENROLLED
            : HostStatus.OFFLINE,
          pendingActions: pendingActions?.pending_actions ?? {},
        };

        return acc;
      }, {});
    } catch (err) {
      const error = new AgentStatusClientError(
        `Failed to fetch sentinel one agent status for agentIds: [${agentIds}], failed with: ${err.message}`,
        500,
        err
      );
      this.log.error(error);
      throw error;
    }
  }
}
