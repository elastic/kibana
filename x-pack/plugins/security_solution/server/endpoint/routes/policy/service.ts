/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ElasticsearchClient,
  IScopedClusterClient,
  SavedObjectsClientContract,
} from '../../../../../../../src/core/server';
import { GetHostPolicyResponse, HostPolicyResponse } from '../../../../common/endpoint/types';
import { INITIAL_POLICY_ID } from './index';
import { Agent } from '../../../../../fleet/common/types/models';
import { EndpointAppContext } from '../../types';
import { ISearchRequestParams } from '../../../../../../../src/plugins/data/common';

export const getESQueryPolicyResponseByAgentID = (
  agentID: string,
  index: string
): ISearchRequestParams => {
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
};

export async function getPolicyResponseByAgentId(
  index: string,
  agentID: string,
  dataClient: IScopedClusterClient
): Promise<GetHostPolicyResponse | undefined> {
  const query = getESQueryPolicyResponseByAgentID(agentID, index);
  const response = await dataClient.asCurrentUser.search<HostPolicyResponse>(query);

  if (response.body.hits.hits.length > 0 && response.body.hits.hits[0]._source != null) {
    return {
      policy_response: response.body.hits.hits[0]._source,
    };
  }

  return undefined;
}

const transformAgentVersionMap = (versionMap: Map<string, number>): { [key: string]: number } => {
  const data: { [key: string]: number } = {};
  versionMap.forEach((value, key) => {
    data[key] = value;
  });
  return data;
};

export async function getAgentPolicySummary(
  endpointAppContext: EndpointAppContext,
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  packageName: string,
  policyId?: string,
  pageSize: number = 1000
): Promise<{ [key: string]: number }> {
  const agentQuery = `packages:"${packageName}"`;
  if (policyId) {
    return transformAgentVersionMap(
      await agentVersionsMap(
        endpointAppContext,
        soClient,
        esClient,
        `${agentQuery} AND policy_id:${policyId}`,
        pageSize
      )
    );
  }

  return transformAgentVersionMap(
    await agentVersionsMap(endpointAppContext, soClient, esClient, agentQuery, pageSize)
  );
}

export async function agentVersionsMap(
  endpointAppContext: EndpointAppContext,
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
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
      .listAgents(esClient, searchOptions(page++));
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
