/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchResponse } from 'elasticsearch';
import { ILegacyScopedClusterClient, SavedObjectsClientContract } from 'kibana/server';
import { GetHostPolicyResponse, HostPolicyResponse } from '../../../../common/endpoint/types';
import { INITIAL_POLICY_ID } from './index';
import { Agent } from '../../../../../fleet/common/types/models';
import { JsonObject } from '../../../../../../../src/plugins/kibana_utils/common';
import { EndpointAppContext } from '../../types';

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

export async function getAgentPolicySummary(
  endpointAppContext: EndpointAppContext,
  soClient: SavedObjectsClientContract,
  packageName: string,
  policyId?: string,
  pageSize: number = 1000
): Promise<JsonObject> {
  const agentVersionMapToJson = (versionMap: Map<string, number>): JsonObject => {
    const jsonObject: { [key: string]: number } = {};
    versionMap.forEach((value, key) => {
      jsonObject[key] = value;
    });
    return jsonObject;
  };

  const agentQuery = `fleet-agents.packages:"${packageName}"`;
  if (policyId) {
    return agentVersionMapToJson(
      await agentVersionsMap(
        endpointAppContext,
        soClient,
        `${agentQuery} AND fleet-agents.policy_id:${policyId}`,
        pageSize
      )
    );
  }

  return agentVersionMapToJson(
    await agentVersionsMap(endpointAppContext, soClient, agentQuery, pageSize)
  );
}

export async function agentVersionsMap(
  endpointAppContext: EndpointAppContext,
  soClient: SavedObjectsClientContract,
  kqlQuery: string,
  pageSize: number = 1000
): Promise<Map<string, number>> {
  const searchOptions = (pageNum: number) => {
    return {
      page: pageNum,
      perPage: pageSize,
      showInactive: false,
      kuery: kqlQuery,
    };
  };

  let page = 1;
  const result: Map<string, number> = new Map<string, number>();
  let hasMore = true;
  while (hasMore) {
    const queryResult = await endpointAppContext.service
      .getAgentService()!
      .listAgents(soClient, searchOptions(page++));
    queryResult.agents.forEach((agent: Agent) => {
      const agentVersion = agent.local_metadata?.elastic?.agent?.version;
      if (result.has(agentVersion)) {
        result.set(agentVersion, result.get(agentVersion)! + 1);
      } else {
        result.set(agentVersion, 1);
      }
    });
    hasMore = queryResult.agents.length > 0;
  }
  return result;
}
