/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client, estypes } from '@elastic/elasticsearch';
import { HostMetadata } from '../types';
import { FleetServerAgent } from '../../../../fleet/common';
import { FleetAgentGenerator } from '../data_generators/fleet_agent_generator';

const defaultFleetAgentGenerator = new FleetAgentGenerator();

/**
 * Indexes a Fleet Agent
 * (NOTE: ensure that fleet is setup first before calling this loading function)
 *
 * @param esClient
 * @param endpointHost
 * @param agentPolicyId
 * @param [kibanaVersion]
 * @param [fleetAgentGenerator]
 */
export const indexFleetAgentForHost = async (
  esClient: Client,
  endpointHost: HostMetadata,
  agentPolicyId: string,
  kibanaVersion: string = '8.0.0',
  fleetAgentGenerator: FleetAgentGenerator = defaultFleetAgentGenerator
): Promise<estypes.SearchHit<FleetServerAgent>> => {
  const agentDoc = fleetAgentGenerator.generateEsHit({
    _source: {
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

  await esClient.index<FleetServerAgent>({
    index: agentDoc._index,
    id: agentDoc._id,
    body: agentDoc._source!,
    op_type: 'create',
  });

  return agentDoc;
};
