/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';
import { AxiosResponse } from 'axios';
import { DeleteByQueryResponse } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
// eslint-disable-next-line import/no-extraneous-dependencies
import { KbnClient } from '@kbn/test';
import { HostMetadata } from '../types';
import {
  Agent,
  AGENT_API_ROUTES,
  FleetServerAgent,
  GetOneAgentResponse,
} from '../../../../fleet/common';
import { FleetAgentGenerator } from '../data_generators/fleet_agent_generator';
import { wrapErrorAndRejectPromise } from './utils';

const defaultFleetAgentGenerator = new FleetAgentGenerator();

export interface IndexedFleetAgentResponse {
  agents: Agent[];
  fleetAgentsIndex: string;
}

/**
 * Indexes a Fleet Agent
 * (NOTE: ensure that fleet is setup first before calling this loading function)
 *
 * @param esClient
 * @param kbnClient
 * @param endpointHost
 * @param agentPolicyId
 * @param [kibanaVersion]
 * @param [fleetAgentGenerator]
 */
export const indexFleetAgentForHost = async (
  esClient: Client,
  kbnClient: KbnClient,
  endpointHost: HostMetadata,
  agentPolicyId: string,
  kibanaVersion: string = '8.0.0',
  fleetAgentGenerator: FleetAgentGenerator = defaultFleetAgentGenerator
): Promise<IndexedFleetAgentResponse> => {
  const agentDoc = fleetAgentGenerator.generateEsHit({
    _source: {
      agent: {
        id: endpointHost.agent.id,
        version: endpointHost.agent.version,
      },
      local_metadata: {
        elastic: {
          agent: {
            version: kibanaVersion,
          },
        },
        host: {
          ...endpointHost.host,
        },
        os: {
          ...endpointHost.host.os,
        },
      },
      policy_id: agentPolicyId,
    },
  });

  const createdFleetAgent = await esClient
    .index<FleetServerAgent>({
      index: agentDoc._index,
      id: agentDoc._id,
      body: agentDoc._source,
      op_type: 'create',
    })
    .catch(wrapErrorAndRejectPromise);

  return {
    fleetAgentsIndex: agentDoc._index,
    agents: [
      await fetchFleetAgent(kbnClient, createdFleetAgent._id).catch(wrapErrorAndRejectPromise),
    ],
  };
};

const fetchFleetAgent = async (kbnClient: KbnClient, agentId: string): Promise<Agent> => {
  return (
    (await kbnClient
      .request({
        path: AGENT_API_ROUTES.INFO_PATTERN.replace('{agentId}', agentId),
        method: 'GET',
      })
      .catch(wrapErrorAndRejectPromise)) as AxiosResponse<GetOneAgentResponse>
  ).data.item;
};

export interface DeleteIndexedFleetAgentsResponse {
  agents: DeleteByQueryResponse | undefined;
}

export const deleteIndexedFleetAgents = async (
  esClient: Client,
  indexedData: IndexedFleetAgentResponse
): Promise<DeleteIndexedFleetAgentsResponse> => {
  const response: DeleteIndexedFleetAgentsResponse = {
    agents: undefined,
  };

  if (indexedData.agents.length) {
    response.agents = await esClient
      .deleteByQuery({
        index: `${indexedData.fleetAgentsIndex}-*`,
        wait_for_completion: true,
        body: {
          query: {
            bool: {
              filter: [
                {
                  terms: {
                    'local_metadata.elastic.agent.id': indexedData.agents.map(
                      (agent) => agent.local_metadata.elastic.agent.id
                    ),
                  },
                },
              ],
            },
          },
        },
      })
      .catch(wrapErrorAndRejectPromise);
  }

  return response;
};
