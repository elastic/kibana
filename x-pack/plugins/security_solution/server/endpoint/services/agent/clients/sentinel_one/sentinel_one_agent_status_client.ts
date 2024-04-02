/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AggregationsAggregate, SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import type { AgentStatuses } from '../../../../../../common/endpoint/types';
import { HostStatus } from '../../../../../../common/endpoint/types';
import type { ResponseActionAgentType } from '../../../../../../common/endpoint/service/response_actions/constants';
import { AgentStatusClient } from '../lib/base_agent_status_client';
import { AgentStatusClientError } from '../errors';
import type { RawSentinelOneInfo } from './types';

const SENTINEL_ONE_AGENT_INDEX = `logs-sentinel_one.agent-default`;

enum SENTINEL_ONE_NETWORK_STATUS {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTING = 'disconnecting',
  DISCONNECTED = 'disconnected',
}

export class SentinelOneAgentStatusClient extends AgentStatusClient {
  protected readonly agentType: ResponseActionAgentType = 'sentinel_one';

  async getAgentStatuses(agentIds: string[]): Promise<AgentStatuses> {
    const dateField = 'sentinel_one.agent.last_active_date';

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
      const searchResult: SearchResponse<
        RawSentinelOneInfo,
        Record<string, AggregationsAggregate>
      > = await this.options.esClient.search(
        {
          index: SENTINEL_ONE_AGENT_INDEX,
          size: 10000,
          query,
          aggs: {
            lastActive: {
              date_range: {
                field: dateField,
                ranges: [
                  {
                    from: 'now-30d/d',
                    to: 'now',
                  },
                ],
              },
            },
          },
          sort: [
            {
              [dateField]: {
                order: 'desc',
              },
            },
          ],
        },
        { ignore: [404] }
      );

      const searchHits = searchResult?.hits?.hits?.map(
        (hit) =>
          hit._source ?? {
            sentinel_one: {
              agent: {
                uuid: '',
                network_status: '',
                is_pending_uninstall: false,
                is_uninstalled: false,
                last_active_date: '',
                is_active: false,
              },
            },
          }
      );

      return agentIds.reduce<AgentStatuses>((acc, agentId) => {
        const agentInfo = searchHits?.find((info) => info?.sentinel_one?.agent?.uuid === agentId)
          ?.sentinel_one?.agent;

        acc[agentId] = {
          agentId,
          agentType: this.agentType,
          capabilities: [],
          found: agentInfo?.uuid === agentId,
          isolated: agentInfo?.network_status === SENTINEL_ONE_NETWORK_STATUS.DISCONNECTED,
          isPendingUninstall: agentInfo?.is_pending_uninstall,
          isUninstalled: agentInfo?.is_uninstalled,
          lastSeen: agentInfo?.last_active_date || '',
          status: agentInfo?.is_active ? HostStatus.HEALTHY : HostStatus.OFFLINE,
          pendingActions: agentInfo
            ? {
                isolate:
                  agentInfo.network_status === SENTINEL_ONE_NETWORK_STATUS.DISCONNECTING ? 1 : 0,
                unisolate:
                  agentInfo?.network_status === SENTINEL_ONE_NETWORK_STATUS.CONNECTING ? 1 : 0,
              }
            : {},
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
