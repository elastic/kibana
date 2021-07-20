/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  IScopedClusterClient,
  KibanaRequest,
  SavedObjectsClientContract,
  SavedObjectsServiceStart,
} from 'kibana/server';
import { HostInfo, HostMetadata } from '../../../../common/endpoint/types';
import { Agent, AgentPolicy, PackagePolicy } from '../../../../../fleet/common';
import { AgentPolicyServiceInterface, AgentService } from '../../../../../fleet/server';

export class EndpointMetadataService {
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
  async getHostMetadata(esClient: IScopedClusterClient, endpointId: string): Promise<HostMetadata> {
    // needs:  esClient (scoped per/request)
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
    esClient: IScopedClusterClient,
    endpointId: string
  ): Promise<HostInfo> {}

  /**
   * Retrieve a single Fleet Agent data
   *
   * @param agentId The elastic agent id (`from `elastic.agent.id`)
   */
  async getFleetAgent(agentId: string): Promise<Agent> {
    // needs: AgentService
    // needs: SavedObjects client (normally scoped, but we likely will use an "internal" user here
  }

  /**
   * Retrieve a specific Fleet Agent Policy
   *
   * @param agentPolicyId
   */
  async getFleetAgentPolicy(
    agentPolicyId: string
  ): Promise<Omit<AgentPolicy, 'package_policies'> & { package_policies: PackagePolicy[] }> {
    // needs: AgentPolicyService
    // needs: SavedObjects client (normally scoped, but we likely will use an "internal" user here
  }
}
