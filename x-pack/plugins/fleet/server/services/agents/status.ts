/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'src/core/server';
import { getAgent, listAgents } from './crud';
import { AGENT_EVENT_SAVED_OBJECT_TYPE, AGENT_SAVED_OBJECT_TYPE } from '../../constants';
import { AgentStatus } from '../../types';

import { AgentStatusKueryHelper } from '../../../common/services';

export async function getAgentStatusById(
  soClient: SavedObjectsClientContract,
  agentId: string
): Promise<AgentStatus> {
  const agent = await getAgent(soClient, agentId);
  return AgentStatusKueryHelper.getAgentStatus(agent);
}

export const getAgentStatus = AgentStatusKueryHelper.getAgentStatus;

export async function getAgentStatusForAgentPolicy(
  soClient: SavedObjectsClientContract,
  agentPolicyId?: string,
  filterKuery?: string
) {
  const [all, online, error, offline] = await Promise.all(
    [
      undefined,
      AgentStatusKueryHelper.buildKueryForOnlineAgents(),
      AgentStatusKueryHelper.buildKueryForErrorAgents(),
      AgentStatusKueryHelper.buildKueryForOfflineAgents(),
    ].map((kuery) =>
      listAgents(soClient, {
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
      })
    )
  );

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

  return {
    events: await getEventsCount(soClient, agentPolicyId),
    total: all.total,
    online: online.total,
    error: error.total,
    offline: offline.total,
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
