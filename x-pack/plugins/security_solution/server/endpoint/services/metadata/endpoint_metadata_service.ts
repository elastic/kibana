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
import { EndpointError } from '../../errors';

type AgentPolicyWithPackagePolicies = Omit<AgentPolicy, 'package_policies'> & {
  package_policies: PackagePolicy[];
};

// Will wrap the given Error with `EndpointError`, which will
// help getting a good picture of where in our code the error originated from.
const wrapErrorIfNeeded = (error: Error): EndpointError =>
  error instanceof EndpointError ? error : new EndpointError(error.message, error);

// used as the callback to `Promise#catch()` to ensure errors (especially those from kibana/elasticsearch clients) are wrapped
const catchAndWrapError = <E extends Error>(error: E) => Promise.reject(wrapErrorIfNeeded(error));

export class EndpointMetadataService {
  /**
   * For internal use only by the `this.DANGEROUS_INTERNAL_SO_CLIENT`
   * @deprecated
   */
  private __DANGEROUS_INTERNAL_SO_CLIENT: SavedObjectsClientContract | undefined;

  /**
   * A Saved Object client that can access any saved object. Used primarly to retrieve fleet data
   * for endpoint enrichment (so that users are not required to have superuser role)
   *
   * **IMPORTANT: SHOULD BE USED ONLY FOR READ-ONLY ACCESS AND WITH DISCRETION**
   *
   * @private
   */
  public get DANGEROUS_INTERNAL_SO_CLIENT() {
    // The INTERNAL SO client must be created during the first time its used. This is because creating it during
    // instance initialization (in `constructor(){}`) causes the SO Client to be invalid (perhaps because this
    // instantiation is happening during the plugin's the start phase)
    if (!this.__DANGEROUS_INTERNAL_SO_CLIENT) {
      const fakeRequest = ({
        headers: {},
        getBasePath: () => '',
        path: '/',
        route: { settings: {} },
        url: { href: {} },
        raw: { req: { url: '/' } },
      } as unknown) as KibanaRequest;

      this.__DANGEROUS_INTERNAL_SO_CLIENT = this.savedObjectsStart.getScopedClient(fakeRequest, {
        excludedWrappers: ['security'],
      });
    }

    return this.__DANGEROUS_INTERNAL_SO_CLIENT;
  }
  constructor(
    private savedObjectsStart: SavedObjectsServiceStart,
    private readonly agentService: AgentService,
    private readonly agentPolicyService: AgentPolicyServiceInterface
  ) {}

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
    const queryResult = await esClient.search<HostMetadata>(query).catch(catchAndWrapError);
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
    try {
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
      const agent = await this.agentService.getAgent(esClient, agentId);
      agent.status = this.agentService.getStatusForAgent(agent);
      return agent;
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
