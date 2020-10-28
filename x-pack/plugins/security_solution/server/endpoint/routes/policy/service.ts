/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchResponse } from 'elasticsearch';
import { ILegacyScopedClusterClient, SavedObjectsClientContract } from 'kibana/server';
import { GetHostPolicyResponse, HostPolicyResponse } from '../../../../common/endpoint/types';
import { INITIAL_POLICY_ID } from './index';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { AgentService } from '../../../../../ingest_manager/server/services';
import { Agent } from '../../../../../ingest_manager/common/types/models';
import { JsonObject } from '../../../../../../../src/plugins/kibana_utils/common';

export function getESQueryPolicyResponseByAgentID(agentID: string, index: string) {
  return {
    body: {
      query: {
        bool: {
          filter: {
            term: {
              'agent.id': agentID,
            },
          },
          must_not: {
            term: {
              'Endpoint.policy.applied.id': INITIAL_POLICY_ID,
            },
          },
        },
      },
      sort: [
        {
          'event.created': {
            order: 'desc',
          },
        },
      ],
      size: 1,
    },
    index,
  };
}

export async function getPolicyResponseByAgentId(
  index: string,
  agentID: string,
  dataClient: ILegacyScopedClusterClient
): Promise<GetHostPolicyResponse | undefined> {
  const query = getESQueryPolicyResponseByAgentID(agentID, index);
  const response = (await dataClient.callAsCurrentUser('search', query)) as SearchResponse<
    HostPolicyResponse
  >;

  if (response.hits.hits.length === 0) {
    return undefined;
  }

  return {
    policy_response: response.hits.hits[0]._source,
  };
}

export async function getAllAgentUniqueVersionCount(
  agentService: AgentService,
  soClient: SavedObjectsClientContract,
  packageName: string,
  poliicyName?: string,
  pageSize: number = 1000
): Promise<JsonObject> {
  const searchOptions = (pageNum: number) => {
    return {
      page: pageNum,
      perPage: pageSize,
      showInactive: false,
      kuery: `fleet-agents.packages:"${packageName}"`,
    };
  };

  let page = 1;
  const result: Map<string, number> = new Map<string, number>();
  let hasMore = true;
  while (hasMore) {
    const unenrolledAgents = await agentService.listAgents(soClient, searchOptions(page++));
    unenrolledAgents.agents.forEach((agent: Agent) => {
      const agentVersion = agent.local_metadata?.elastic?.agent?.version;
      if (result.has(agentVersion)) {
        result.set(agentVersion, result.get(agentVersion)! + 1);
      } else {
        result.set(agentVersion, 1);
      }
    });
    hasMore = unenrolledAgents.agents.length > 0;
  }
  const jsonObject: { [key: string]: number } = {};
  result.forEach((value, key) => {
    jsonObject[key] = value;
  });

  return {
    package: packageName,
    summary: { ...jsonObject },
  };
}
