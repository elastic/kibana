/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from 'src/core/server';
import pMap from 'p-map';

import type { KueryNode } from '@kbn/es-query';
import { fromKueryExpression } from '@kbn/es-query';

import { AGENT_SAVED_OBJECT_TYPE } from '../../constants';
import type { AgentStatus } from '../../types';
import { AgentStatusKueryHelper } from '../../../common/services';

import { getAgentById, getAgentsByKuery, removeSOAttributes } from './crud';

export async function getAgentStatusById(
  esClient: ElasticsearchClient,
  agentId: string
): Promise<AgentStatus> {
  return (await getAgentById(esClient, agentId)).status!;
}

export const getAgentStatus = AgentStatusKueryHelper.getAgentStatus;

function joinKuerys(...kuerys: Array<string | undefined>) {
  return kuerys
    .filter((kuery) => kuery !== undefined)
    .reduce((acc: KueryNode | undefined, kuery: string | undefined): KueryNode | undefined => {
      if (kuery === undefined) {
        return acc;
      }
      const normalizedKuery: KueryNode = fromKueryExpression(removeSOAttributes(kuery || ''));

      if (!acc) {
        return normalizedKuery;
      }

      return {
        type: 'function',
        function: 'and',
        arguments: [acc, normalizedKuery],
      };
    }, undefined as KueryNode | undefined);
}

export async function getAgentStatusForAgentPolicy(
  esClient: ElasticsearchClient,
  agentPolicyId?: string,
  filterKuery?: string
) {
  const [all, allActive, online, error, offline, updating] = await pMap(
    [
      undefined, // All agents, including inactive
      undefined, // All active agents
      AgentStatusKueryHelper.buildKueryForOnlineAgents(),
      AgentStatusKueryHelper.buildKueryForErrorAgents(),
      AgentStatusKueryHelper.buildKueryForOfflineAgents(),
      AgentStatusKueryHelper.buildKueryForUpdatingAgents(),
    ],
    (kuery, index) =>
      getAgentsByKuery(esClient, {
        showInactive: index === 0,
        perPage: 0,
        page: 1,
        kuery: joinKuerys(
          ...[
            kuery,
            filterKuery,
            `${AGENT_SAVED_OBJECT_TYPE}.attributes.active:true`,
            agentPolicyId ? `${AGENT_SAVED_OBJECT_TYPE}.policy_id:"${agentPolicyId}"` : undefined,
          ]
        ),
      }),
    {
      concurrency: 1,
    }
  );

  return {
    total: allActive.total,
    inactive: all.total - allActive.total,
    online: online.total,
    error: error.total,
    offline: offline.total,
    updating: updating.total,
    other: all.total - online.total - error.total - offline.total,
    /* @deprecated Agent events do not exists anymore */
    events: 0,
  };
}
