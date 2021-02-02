/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ElasticsearchClient, SavedObjectsClientContract } from 'src/core/server';
import pMap from 'p-map';
import { getAgent, listAgents } from './crud';
import { AGENT_EVENT_SAVED_OBJECT_TYPE, AGENT_SAVED_OBJECT_TYPE } from '../../constants';
import { AgentStatus } from '../../types';

import { AgentStatusKueryHelper } from '../../../common/services';

export async function getAgentStatusById(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  agentId: string
): Promise<AgentStatus> {
  const agent = await getAgent(soClient, esClient, agentId);
  return AgentStatusKueryHelper.getAgentStatus(agent);
}

export const getAgentStatus = AgentStatusKueryHelper.getAgentStatus;

function joinKuerys(...kuerys: Array<string | undefined>) {
  return kuerys
    .filter((kuery) => kuery !== undefined)
    .reduce((acc, kuery) => {
      if (acc === '') {
        return `(${kuery})`;
      }

      return `${acc} and (${kuery})`;
    }, '');
}

export async function getAgentStatusForAgentPolicy(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  agentPolicyId?: string,
  filterKuery?: string
) {
  const [all, online, error, offline, updating] = await pMap(
    [
      undefined,
      AgentStatusKueryHelper.buildKueryForOnlineAgents(),
      AgentStatusKueryHelper.buildKueryForErrorAgents(),
      AgentStatusKueryHelper.buildKueryForOfflineAgents(),
      AgentStatusKueryHelper.buildKueryForUpdatingAgents(),
    ],
    (kuery) =>
      listAgents(soClient, esClient, {
        showInactive: false,
        perPage: 0,
        page: 1,
        kuery: joinKuerys(
          ...[
            kuery,
            filterKuery,
            agentPolicyId ? `${AGENT_SAVED_OBJECT_TYPE}.policy_id:"${agentPolicyId}"` : undefined,
          ]
        ),
      }),
    {
      concurrency: 1,
    }
  );

  return {
    events: await getEventsCount(soClient, agentPolicyId),
    total: all.total,
    online: online.total,
    error: error.total,
    offline: offline.total,
    updating: updating.total,
    other: all.total - online.total - error.total - offline.total,
  };
}

async function getEventsCount(soClient: SavedObjectsClientContract, agentPolicyId?: string) {
  const { total } = await soClient.find({
    type: AGENT_EVENT_SAVED_OBJECT_TYPE,
    searchFields: ['policy_id'],
    search: agentPolicyId,
    perPage: 0,
    page: 1,
    sortField: 'timestamp',
    sortOrder: 'desc',
    defaultSearchOperator: 'AND',
  });

  return total;
}
