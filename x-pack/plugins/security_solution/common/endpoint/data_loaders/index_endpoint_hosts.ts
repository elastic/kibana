/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { cloneDeep } from 'lodash';
import type { AxiosResponse } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import type { KbnClient } from '@kbn/test';
import type { DeleteByQueryResponse } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { Agent, CreatePackagePolicyResponse, GetInfoResponse } from '@kbn/fleet-plugin/common';
import { EndpointDocGenerator } from '../generate_data';
import type { HostMetadata, HostPolicyResponse } from '../types';
import type {
  DeleteIndexedFleetAgentsResponse,
  IndexedFleetAgentResponse,
} from './index_fleet_agent';
import { deleteIndexedFleetAgents, indexFleetAgentForHost } from './index_fleet_agent';
import type {
  DeleteIndexedEndpointFleetActionsResponse,
  IndexedEndpointAndFleetActionsForHostResponse,
} from './index_endpoint_fleet_actions';
import {
  deleteIndexedEndpointAndFleetActions,
  indexEndpointAndFleetActionsForHost,
} from './index_endpoint_fleet_actions';

import type {
  DeleteIndexedFleetEndpointPoliciesResponse,
  IndexedFleetEndpointPolicyResponse,
} from './index_fleet_endpoint_policy';
import {
  deleteIndexedFleetEndpointPolicies,
  indexFleetEndpointPolicy,
} from './index_fleet_endpoint_policy';
import { metadataCurrentIndexPattern } from '../constants';
import { EndpointDataLoadingError, mergeAndAppendArrays, wrapErrorAndRejectPromise } from './utils';

export interface IndexedHostsResponse
  extends IndexedFleetAgentResponse,
    IndexedEndpointAndFleetActionsForHostResponse,
    IndexedFleetEndpointPolicyResponse {
  /**
   * The documents (1 or more) that were generated for the (single) endpoint host.
   * If consuming this data and wanting only the last one created, just access the
   * last item in the array
   */
  hosts: HostMetadata[];

  /**
   * The list of Endpoint Policy Response documents (1 or more) that was created.
   */
  policyResponses: HostPolicyResponse[];

  metadataIndex: string;
  policyResponseIndex: string;
}

/**
 * Indexes the requested number of documents for the endpoint host metadata currently being output by the generator.
 * Endpoint Host metadata documents are added to an index that is set as "append only", thus one Endpoint host could
 * have multiple documents in that index.
 *
 *
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
  epmEndpointPackage: GetInfoResponse['item'];
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
    agents: [],
    policyResponses: [],
    metadataIndex,
    policyResponseIndex,
    fleetAgentsIndex: '',
    endpointActionResponses: [],
    endpointActionResponsesIndex: '',
    endpointActions: [],
    endpointActionsIndex: '',
    actionResponses: [],
    responsesIndex: '',
    actions: [],
    actionsIndex: '',
    integrationPolicies: [],
    agentPolicies: [],
  };
  let hostMetadata: HostMetadata;
  let wasAgentEnrolled = false;
  let enrolledAgent: undefined | Agent;

  for (let j = 0; j < numDocs; j++) {
    generator.updateHostData();
    generator.updateHostPolicyData();

    hostMetadata = generator.generateHostMetadata(
      timestamp - timeBetweenDocs * (numDocs - j - 1),
      EndpointDocGenerator.createDataStreamFromIndex(metadataIndex)
    );

    if (enrollFleet) {
      const { id: appliedPolicyId, name: appliedPolicyName } = hostMetadata.Endpoint.policy.applied;
      const uniqueAppliedPolicyName = `${appliedPolicyName}-${uuidv4()}`;

      // If we don't yet have a "real" policy record, then create it now in ingest (package config)
      if (!realPolicies[appliedPolicyId]) {
        const createdPolicies = await indexFleetEndpointPolicy(
          kbnClient,
          uniqueAppliedPolicyName,
          epmEndpointPackage.version
        );

        mergeAndAppendArrays(response, createdPolicies);

        // eslint-disable-next-line require-atomic-updates
        realPolicies[appliedPolicyId] = createdPolicies.integrationPolicies[0];
      }

      // If we did not yet enroll an agent for this Host, do it now that we have good policy id
      if (!wasAgentEnrolled) {
        wasAgentEnrolled = true;

        const indexedAgentResponse = await indexFleetAgentForHost(
          client,
          kbnClient,
          hostMetadata,
          realPolicies[appliedPolicyId].policy_id,
          kibanaVersion
        );

        enrolledAgent = indexedAgentResponse.agents[0];
        mergeAndAppendArrays(response, indexedAgentResponse);
      }
      // Update the Host metadata record with the ID of the "real" policy along with the enrolled agent id
      hostMetadata = {
        ...hostMetadata,
        agent: {
          ...hostMetadata.agent,
          id: enrolledAgent?.id ?? hostMetadata.agent.id,
        },
        elastic: {
          ...hostMetadata.elastic,
          agent: {
            ...hostMetadata.elastic.agent,
            id: enrolledAgent?.id ?? hostMetadata.elastic.agent.id,
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

      // Create some fleet endpoint actions and .logs-endpoint actions for this Host
      const actionsResponse = await indexEndpointAndFleetActionsForHost(
        client,
        hostMetadata,
        undefined
      );
      mergeAndAppendArrays(response, actionsResponse);
    }

    await client
      .index({
        index: metadataIndex,
        body: hostMetadata,
        op_type: 'create',
        refresh: 'wait_for',
      })
      .catch(wrapErrorAndRejectPromise);

    const hostPolicyResponse = generator.generatePolicyResponse({
      ts: timestamp - timeBetweenDocs * (numDocs - j - 1),
      policyDataStream: EndpointDocGenerator.createDataStreamFromIndex(policyResponseIndex),
    });

    await client
      .index({
        index: policyResponseIndex,
        body: hostPolicyResponse,
        op_type: 'create',
        refresh: 'wait_for',
      })
      .catch(wrapErrorAndRejectPromise);

    // Clone the hostMetadata and policyResponse document to ensure that no shared state
    // (as a result of using the generator) is returned across docs.
    response.hosts.push(cloneDeep(hostMetadata));
    response.policyResponses.push(cloneDeep(hostPolicyResponse));
  }

  return response;
}

const fetchKibanaVersion = async (kbnClient: KbnClient) => {
  const version = (
    (await kbnClient.request({
      path: '/api/status',
      method: 'GET',
    })) as AxiosResponse
  ).data.version.number;

  if (!version) {
    throw new EndpointDataLoadingError('failed to get kibana version via `/api/status` api');
  }

  return version;
};

export interface DeleteIndexedEndpointHostsResponse
  extends DeleteIndexedFleetAgentsResponse,
    DeleteIndexedEndpointFleetActionsResponse,
    DeleteIndexedFleetEndpointPoliciesResponse {
  hosts: DeleteByQueryResponse | undefined;
  policyResponses: DeleteByQueryResponse | undefined;
}

export const deleteIndexedEndpointHosts = async (
  esClient: Client,
  kbnClient: KbnClient,
  indexedData: IndexedHostsResponse
): Promise<DeleteIndexedEndpointHostsResponse> => {
  const response: DeleteIndexedEndpointHostsResponse = {
    hosts: undefined,
    policyResponses: undefined,
    agents: undefined,
    responses: undefined,
    actions: undefined,
    endpointActionRequests: undefined,
    endpointActionResponses: undefined,
    integrationPolicies: undefined,
    agentPolicies: undefined,
  };

  if (indexedData.hosts.length) {
    const body = {
      query: {
        bool: {
          filter: [{ terms: { 'agent.id': indexedData.hosts.map((host) => host.agent.id) } }],
        },
      },
    };

    response.hosts = await esClient
      .deleteByQuery({
        index: indexedData.metadataIndex,
        wait_for_completion: true,
        body,
      })
      .catch(wrapErrorAndRejectPromise);

    // Delete from the transform destination index
    await esClient
      .deleteByQuery({
        index: metadataCurrentIndexPattern,
        wait_for_completion: true,
        body,
      })
      .catch(wrapErrorAndRejectPromise);
  }

  if (indexedData.policyResponses.length) {
    response.policyResponses = await esClient
      .deleteByQuery({
        index: indexedData.policyResponseIndex,
        wait_for_completion: true,
        body: {
          query: {
            bool: {
              filter: [
                {
                  terms: {
                    'agent.id': indexedData.policyResponses.map(
                      (policyResponse) => policyResponse.agent.id
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

  mergeAndAppendArrays(response, await deleteIndexedFleetAgents(esClient, indexedData));
  mergeAndAppendArrays(response, await deleteIndexedEndpointAndFleetActions(esClient, indexedData));
  mergeAndAppendArrays(response, await deleteIndexedFleetEndpointPolicies(kbnClient, indexedData));

  return response;
};
