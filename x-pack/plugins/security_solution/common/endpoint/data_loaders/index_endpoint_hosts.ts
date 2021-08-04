/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client, estypes } from '@elastic/elasticsearch';
import { cloneDeep } from 'lodash';
import { AxiosResponse } from 'axios';
// eslint-disable-next-line import/no-extraneous-dependencies
import { KbnClient } from '@kbn/test';
import {
  Agent,
  AGENT_API_ROUTES,
  AGENT_POLICY_API_ROUTES,
  CreateAgentPolicyRequest,
  CreateAgentPolicyResponse,
  CreatePackagePolicyRequest,
  CreatePackagePolicyResponse,
  FleetServerAgent,
  GetOneAgentResponse,
  GetPackagesResponse,
  PACKAGE_POLICY_API_ROUTES,
} from '../../../../fleet/common';
import { EndpointDocGenerator } from '../generate_data';
import { HostMetadata } from '../types';
import { policyFactory as policyConfigFactory } from '../models/policy_config';
import { indexFleetAgentForHost } from './index_fleet_agent';
import { indexFleetActionsForHost } from './index_fleet_actions';

export interface IndexedHostsResponse {
  hosts: HostMetadata[];
  policies: Array<CreatePackagePolicyResponse['item']>;
  agents: Agent[];
}

/**
 * Indexes the requested number of documents for the endpoint host metadata currently being output by the generator.
 * Endpoint Host metadata documents are addeded to an index that is set as "append only", thus one Endpoint host could
 * have multiple documents in that index.
 *
 * @param numDocs
 * @param client
 * @param kbnClient
 * @param realPolicies
 * @param epmEndpointPackage
 * @param metadataIndex
 * @param policyResponseIndex
 * @param enrollFleet
 * @param generator
 */
export async function indexEndpointHostDocs({
  numDocs,
  client,
  kbnClient,
  realPolicies,
  epmEndpointPackage,
  metadataIndex,
  policyResponseIndex,
  enrollFleet,
  generator,
}: {
  numDocs: number;
  client: Client;
  kbnClient: KbnClient;
  realPolicies: Record<string, CreatePackagePolicyResponse['item']>;
  epmEndpointPackage: GetPackagesResponse['response'][0];
  metadataIndex: string;
  policyResponseIndex: string;
  enrollFleet: boolean;
  generator: EndpointDocGenerator;
}): Promise<IndexedHostsResponse> {
  const timeBetweenDocs = 6 * 3600 * 1000; // 6 hours between metadata documents
  const timestamp = new Date().getTime();
  const kibanaVersion = await fetchKibanaVersion(kbnClient);
  const response: IndexedHostsResponse = {
    hosts: [],
    policies: [],
    agents: [],
  };
  let hostMetadata: HostMetadata;
  let wasAgentEnrolled = false;
  let enrolledAgent: undefined | estypes.SearchHit<FleetServerAgent>;

  for (let j = 0; j < numDocs; j++) {
    generator.updateHostData();
    generator.updateHostPolicyData();

    hostMetadata = generator.generateHostMetadata(
      timestamp - timeBetweenDocs * (numDocs - j - 1),
      EndpointDocGenerator.createDataStreamFromIndex(metadataIndex)
    );

    if (enrollFleet) {
      const { id: appliedPolicyId, name: appliedPolicyName } = hostMetadata.Endpoint.policy.applied;

      // If we don't yet have a "real" policy record, then create it now in ingest (package config)
      if (!realPolicies[appliedPolicyId]) {
        // eslint-disable-next-line require-atomic-updates
        realPolicies[appliedPolicyId] = await createPolicy(
          kbnClient,
          appliedPolicyName,
          epmEndpointPackage.version
        );

        response.policies.push(realPolicies[appliedPolicyId]);
      }

      // If we did not yet enroll an agent for this Host, do it now that we have good policy id
      if (!wasAgentEnrolled) {
        wasAgentEnrolled = true;

        enrolledAgent = await indexFleetAgentForHost(
          client,
          hostMetadata!,
          realPolicies[appliedPolicyId].policy_id,
          kibanaVersion
        );

        response.agents.push(await fetchFleetAgent(kbnClient, enrolledAgent?._id));
      }
      // Update the Host metadata record with the ID of the "real" policy along with the enrolled agent id
      hostMetadata = {
        ...hostMetadata,
        elastic: {
          ...hostMetadata.elastic,
          agent: {
            ...hostMetadata.elastic.agent,
            id: enrolledAgent?._id ?? hostMetadata.elastic.agent.id,
          },
        },
        Endpoint: {
          ...hostMetadata.Endpoint,
          policy: {
            ...hostMetadata.Endpoint.policy,
            applied: {
              ...hostMetadata.Endpoint.policy.applied,
              id: realPolicies[appliedPolicyId].id,
            },
          },
        },
      };

      // Create some actions for this Host
      await indexFleetActionsForHost(client, hostMetadata);
    }

    await client.index({
      index: metadataIndex,
      body: hostMetadata,
      op_type: 'create',
    });

    await client.index({
      index: policyResponseIndex,
      body: generator.generatePolicyResponse({
        ts: timestamp - timeBetweenDocs * (numDocs - j - 1),
        policyDataStream: EndpointDocGenerator.createDataStreamFromIndex(policyResponseIndex),
      }),
      op_type: 'create',
    });

    // Clone the hostMetadata document to ensure that no shared state (as a result of using the
    // generator) is returned across docs
    response.hosts.push(cloneDeep(hostMetadata));
  }

  return response;
}

const createPolicy = async (
  kbnClient: KbnClient,
  policyName: string,
  endpointPackageVersion: string
): Promise<CreatePackagePolicyResponse['item']> => {
  // Create Agent Policy first
  const newAgentPolicyData: CreateAgentPolicyRequest['body'] = {
    name: `Policy for ${policyName} (${Math.random().toString(36).substr(2, 5)})`,
    description: `Policy created with endpoint data generator (${policyName})`,
    namespace: 'default',
  };
  let agentPolicy;
  try {
    agentPolicy = (await kbnClient.request({
      path: AGENT_POLICY_API_ROUTES.CREATE_PATTERN,
      method: 'POST',
      body: newAgentPolicyData,
    })) as AxiosResponse<CreateAgentPolicyResponse>;
  } catch (error) {
    throw new Error(`create policy ${error}`);
  }

  // Create Package Configuration
  const newPackagePolicyData: CreatePackagePolicyRequest['body'] = {
    name: policyName,
    description: 'Protect the worlds data',
    policy_id: agentPolicy.data.item.id,
    enabled: true,
    output_id: '',
    inputs: [
      {
        type: 'endpoint',
        enabled: true,
        streams: [],
        config: {
          policy: {
            value: policyConfigFactory(),
          },
        },
      },
    ],
    namespace: 'default',
    package: {
      name: 'endpoint',
      title: 'endpoint',
      version: endpointPackageVersion,
    },
  };
  const packagePolicy = (await kbnClient.request({
    path: PACKAGE_POLICY_API_ROUTES.CREATE_PATTERN,
    method: 'POST',
    body: newPackagePolicyData,
  })) as AxiosResponse<CreatePackagePolicyResponse>;
  return packagePolicy.data.item;
};

const fetchKibanaVersion = async (kbnClient: KbnClient) => {
  const version = ((await kbnClient.request({
    path: '/api/status',
    method: 'GET',
  })) as AxiosResponse).data.version.number;

  if (!version) {
    // eslint-disable-next-line no-console
    console.log('failed to retrieve kibana version');
    return '8.0.0';
  }

  return version;
};

const fetchFleetAgent = async (kbnClient: KbnClient, agentId: string): Promise<Agent> => {
  return ((await kbnClient.request({
    path: AGENT_API_ROUTES.INFO_PATTERN.replace('{agentId}', agentId),
    method: 'GET',
  })) as AxiosResponse<GetOneAgentResponse>).data.item;
};
