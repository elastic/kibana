/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ElasticsearchClient,
  KibanaRequest,
  SavedObjectsClientContract,
  SavedObjectsServiceStart,
} from 'kibana/server';
import { HostInfo, HostMetadata } from '../../../../common/endpoint/types';
import { Agent, AgentPolicy, PackagePolicy } from '../../../../../fleet/common';
import {
  AgentNotFoundError,
  AgentPolicyServiceInterface,
  AgentService,
} from '../../../../../fleet/server';
import {
  EndpointHostNotFoundError,
  FleetAgentNotFoundError,
  FleetAgentPolicyNotFoundError,
} from './errors';
import { getESQueryHostMetadataByID } from '../../routes/metadata/query_builders';
import { queryResponseToHostResult } from '../../routes/metadata/support/query_strategies';
import { fleetAgentStatusToEndpointHostStatus } from '../../utils';

type AgentPolicyWithPackagePolicies = Omit<AgentPolicy, 'package_policies'> & {
  package_policies: PackagePolicy[];
};

export class EndpointMetadataService {
  /**
   * A Saved Object client that can access any saved object. Used primarly to retrieve fleet data
   * for endpoint enrichment (so that users are not required to have superuser role)
   *
   * **IMPORTANT: SHOULD BE USED ONLY FOR READ-ONLY ACCESS AND WITH DISCRETION**
   *
   * @private
   */
  private readonly DANGEROUS_INTERNAL_SO_CLIENT: SavedObjectsClientContract;

  constructor(
    private savedObjectsStart: SavedObjectsServiceStart,
    private readonly agentService: AgentService,
    private readonly agentPolicyService: AgentPolicyServiceInterface
  ) {
    const fakeRequest = ({
      headers: {},
      getBasePath: () => '',
      path: '/',
      route: { settings: {} },
      url: { href: {} },
      raw: { req: { url: '/' } },
    } as unknown) as KibanaRequest;

    this.DANGEROUS_INTERNAL_SO_CLIENT = this.savedObjectsStart.getScopedClient(fakeRequest, {
      excludedWrappers: ['security'],
    });
  }

  /**
   * Retrieve a single endpoint host metadata
   * (NOTE: Not enriched with fleet data. See `getEnrichedHostMetadata()` wanting a more complete picture of the Endpoint)
   *
   * @param esClient Elasticsearch Client (usually scoped to the user's context)
   * @param endpointId the endpoint id (from `agent.id`)
   *
   * @throws
   */
  async getHostMetadata(esClient: ElasticsearchClient, endpointId: string): Promise<HostMetadata> {
    const query = getESQueryHostMetadataByID(endpointId);
    const queryResult = await esClient.search<HostMetadata>(query);
    const endpointMetadata = queryResponseToHostResult(queryResult.body).result;

    if (endpointMetadata) {
      return endpointMetadata;
    }

    throw new EndpointHostNotFoundError(`Endpoint with id ${endpointId} not found`);
  }

  /**
   * Retrieve a single endpoint host metadata along with fleet information
   *
   * @param esClient Elasticsearch Client (usually scoped to the user's context)
   * @param endpointId the endpoint id (from `agent.id`)
   *
   * @throws
   */
  async getEnrichedHostMetadata(
    esClient: ElasticsearchClient,
    endpointId: string
  ): Promise<HostInfo> {
    const endpointMetadata = await this.getHostMetadata(esClient, endpointId);
    const fleetAgent = await this.getFleetAgent(esClient, endpointMetadata.elastic.agent.id);
    const fleetAgentPolicy = await this.getFleetAgentPolicy(fleetAgent.policy_id!);
    const endpointPackagePolicy = fleetAgentPolicy.package_policies.find(
      (policy: PackagePolicy) => policy.package?.name === 'endpoint'
    );

    return {
      metadata: endpointMetadata,
      host_status: fleetAgentStatusToEndpointHostStatus(
        this.agentService.getStatusForAgent(fleetAgent)
      ),
      policy_info: {
        agent: {
          applied: {
            revision: fleetAgent.policy_revision ?? 0,
            id: fleetAgent.policy_id ?? '',
          },
          configured: {
            revision: fleetAgentPolicy.revision,
            id: fleetAgentPolicy.id,
          },
        },
        endpoint: {
          revision: endpointPackagePolicy?.revision ?? 0,
          id: endpointPackagePolicy?.id ?? '',
        },
      },
    };
  }

  /**
   * Retrieve a single Fleet Agent data
   *
   * @param esClient Elasticsearch Client (usually scoped to the user's context)
   * @param agentId The elastic agent id (`from `elastic.agent.id`)
   */
  async getFleetAgent(esClient: ElasticsearchClient, agentId: string): Promise<Agent> {
    try {
      const agent = await this.agentService.getAgent(esClient, agentId);
      agent.status = this.agentService.getStatusForAgent(agent);
      return agent;
    } catch (error) {
      if (error instanceof AgentNotFoundError) {
        throw new FleetAgentNotFoundError(`agent with id ${agentId} not found`, error);
      }

      throw error;
    }
  }

  /**
   * Retrieve a specific Fleet Agent Policy
   *
   * @param agentPolicyId
   *
   * @throws
   */
  async getFleetAgentPolicy(agentPolicyId: string): Promise<AgentPolicyWithPackagePolicies> {
    const agentPolicy = await this.agentPolicyService.get(
      this.DANGEROUS_INTERNAL_SO_CLIENT,
      agentPolicyId,
      true
    );

    if (agentPolicy) {
      return agentPolicy as AgentPolicyWithPackagePolicies;
    }

    throw new FleetAgentPolicyNotFoundError(
      `Fleet agent policy with id ${agentPolicyId} not found`
    );
  }
}
