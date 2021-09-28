/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ElasticsearchClient,
  Logger,
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
  EndpointHostUnEnrolledError,
  FleetAgentNotFoundError,
  FleetAgentPolicyNotFoundError,
} from './errors';
import {
  getESQueryHostMetadataByFleetAgentIds,
  getESQueryHostMetadataByID,
} from '../../routes/metadata/query_builders';
import {
  queryResponseToHostListResult,
  queryResponseToHostResult,
} from '../../routes/metadata/support/query_strategies';
import {
  catchAndWrapError,
  DEFAULT_ENDPOINT_HOST_STATUS,
  fleetAgentStatusToEndpointHostStatus,
  wrapErrorIfNeeded,
} from '../../utils';
import { EndpointError } from '../../errors';
import { createInternalReadonlySoClient } from '../../utils/create_internal_readonly_so_client';

type AgentPolicyWithPackagePolicies = Omit<AgentPolicy, 'package_policies'> & {
  package_policies: PackagePolicy[];
};

export class EndpointMetadataService {
  /**
   * For internal use only by the `this.DANGEROUS_INTERNAL_SO_CLIENT`
   * @deprecated
   */
  private __DANGEROUS_INTERNAL_SO_CLIENT: SavedObjectsClientContract | undefined;

  constructor(
    private savedObjectsStart: SavedObjectsServiceStart,
    private readonly agentService: AgentService,
    private readonly agentPolicyService: AgentPolicyServiceInterface,
    private readonly logger?: Logger
  ) {}

  /**
   * An INTERNAL Saved Object client that is effectively the system user and has all privileges and permissions and
   * can access any saved object. Used primarly to retrieve fleet data for endpoint enrichment (so that users are
   * not required to have superuser role)
   *
   * **IMPORTANT: SHOULD BE USED ONLY FOR READ-ONLY ACCESS AND WITH DISCRETION**
   *
   * @private
   */
  private get DANGEROUS_INTERNAL_SO_CLIENT() {
    // The INTERNAL SO client must be created during the first time its used. This is because creating it during
    // instance initialization (in `constructor(){}`) causes the SO Client to be invalid (perhaps because this
    // instantiation is happening during the plugin's the start phase)
    if (!this.__DANGEROUS_INTERNAL_SO_CLIENT) {
      this.__DANGEROUS_INTERNAL_SO_CLIENT = createInternalReadonlySoClient(this.savedObjectsStart);
    }

    return this.__DANGEROUS_INTERNAL_SO_CLIENT;
  }

  /**
   * Retrieve a single endpoint host metadata. Note that the return endpoint document, if found,
   * could be associated with a Fleet Agent that is no longer active. If wanting to ensure the
   * endpoint is associated with an active Fleet Agent, then use `getEnrichedHostMetadata()` instead
   *
   * @param esClient Elasticsearch Client (usually scoped to the user's context)
   * @param endpointId the endpoint id (from `agent.id`)
   *
   * @throws
   */
  async getHostMetadata(esClient: ElasticsearchClient, endpointId: string): Promise<HostMetadata> {
    const query = getESQueryHostMetadataByID(endpointId);
    const queryResult = await esClient.search<HostMetadata>(query).catch(catchAndWrapError);
    const endpointMetadata = queryResponseToHostResult(queryResult.body).result;

    if (endpointMetadata) {
      return endpointMetadata;
    }

    throw new EndpointHostNotFoundError(`Endpoint with id ${endpointId} not found`);
  }

  /**
   * Find a  list of Endpoint Host Metadata document associated with a given list of Fleet Agent Ids
   * @param esClient
   * @param fleetAgentIds
   */
  async findHostMetadataForFleetAgents(
    esClient: ElasticsearchClient,
    fleetAgentIds: string[]
  ): Promise<HostMetadata[]> {
    const query = getESQueryHostMetadataByFleetAgentIds(fleetAgentIds);

    query.size = fleetAgentIds.length;

    const searchResult = await esClient
      .search<HostMetadata>(query, { ignore: [404] })
      .catch(catchAndWrapError);

    return queryResponseToHostListResult(searchResult.body).resultList;
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

    let fleetAgentId = endpointMetadata.elastic.agent.id;
    let fleetAgent: Agent | undefined;

    // Get Fleet agent
    try {
      if (!fleetAgentId) {
        fleetAgentId = endpointMetadata.agent.id;
        this.logger?.warn(`Missing elastic agent id, using host id instead ${fleetAgentId}`);
      }

      fleetAgent = await this.getFleetAgent(esClient, fleetAgentId);
    } catch (error) {
      if (error instanceof FleetAgentNotFoundError) {
        this.logger?.warn(`agent with id ${fleetAgentId} not found`);
      } else {
        throw error;
      }
    }

    // If the agent is not longer active, then that means that the Agent/Endpoint have been un-enrolled from the host
    if (fleetAgent && !fleetAgent.active) {
      throw new EndpointHostUnEnrolledError(
        `Endpoint with id ${endpointId} (Fleet agent id ${fleetAgentId}) is unenrolled`
      );
    }

    // ------------------------------------------------------------------------------
    // Any failures in enriching the Host form this point should NOT cause an error
    // ------------------------------------------------------------------------------
    try {
      let fleetAgentPolicy: AgentPolicyWithPackagePolicies | undefined;
      let endpointPackagePolicy: PackagePolicy | undefined;

      // Get Agent Policy and Endpoint Package Policy
      if (fleetAgent) {
        try {
          fleetAgentPolicy = await this.getFleetAgentPolicy(fleetAgent.policy_id!);
          endpointPackagePolicy = fleetAgentPolicy.package_policies.find(
            (policy) => policy.package?.name === 'endpoint'
          );
        } catch (error) {
          this.logger?.error(error);
        }
      }

      return {
        metadata: endpointMetadata,
        host_status: fleetAgent
          ? fleetAgentStatusToEndpointHostStatus(fleetAgent.status!)
          : DEFAULT_ENDPOINT_HOST_STATUS,
        policy_info: {
          agent: {
            applied: {
              revision: fleetAgent?.policy_revision ?? 0,
              id: fleetAgent?.policy_id ?? '',
            },
            configured: {
              revision: fleetAgentPolicy?.revision ?? 0,
              id: fleetAgentPolicy?.id ?? '',
            },
          },
          endpoint: {
            revision: endpointPackagePolicy?.revision ?? 0,
            id: endpointPackagePolicy?.id ?? '',
          },
        },
      };
    } catch (error) {
      throw wrapErrorIfNeeded(error);
    }
  }

  /**
   * Retrieve a single Fleet Agent data
   *
   * @param esClient Elasticsearch Client (usually scoped to the user's context)
   * @param agentId The elastic agent id (`from `elastic.agent.id`)
   */
  async getFleetAgent(esClient: ElasticsearchClient, agentId: string): Promise<Agent> {
    try {
      return await this.agentService.getAgent(esClient, agentId);
    } catch (error) {
      if (error instanceof AgentNotFoundError) {
        throw new FleetAgentNotFoundError(`agent with id ${agentId} not found`, error);
      }

      throw new EndpointError(error.message, error);
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
    const agentPolicy = await this.agentPolicyService
      .get(this.DANGEROUS_INTERNAL_SO_CLIENT, agentPolicyId, true)
      .catch(catchAndWrapError);

    if (agentPolicy) {
      return agentPolicy as AgentPolicyWithPackagePolicies;
    }

    throw new FleetAgentPolicyNotFoundError(
      `Fleet agent policy with id ${agentPolicyId} not found`
    );
  }
}
