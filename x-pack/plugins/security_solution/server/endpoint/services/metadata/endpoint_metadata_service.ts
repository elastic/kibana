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

import { SearchTotalHits, SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import {
  HostInfo,
  HostMetadata,
  MaybeImmutable,
  MetadataListResponse,
  PolicyData,
  UnitedAgentMetadata,
} from '../../../../common/endpoint/types';
import { Agent, AgentPolicy, PackagePolicy } from '../../../../../fleet/common';
import {
  AgentNotFoundError,
  AgentPolicyServiceInterface,
  PackagePolicyServiceInterface,
} from '../../../../../fleet/server';
import {
  EndpointHostNotFoundError,
  EndpointHostUnEnrolledError,
  FleetAgentNotFoundError,
  FleetAgentPolicyNotFoundError,
  FleetEndpointPackagePolicyNotFoundError,
} from './errors';
import {
  getESQueryHostMetadataByFleetAgentIds,
  getESQueryHostMetadataByID,
  buildUnitedIndexQuery,
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
import { createInternalReadonlySoClient } from '../../utils/create_internal_readonly_so_client';
import { METADATA_UNITED_INDEX } from '../../../../common/endpoint/constants';
import { getAllEndpointPackagePolicies } from '../../routes/metadata/support/endpoint_package_policies';
import { getAgentStatus } from '../../../../../fleet/common/services/agent_status';
import { GetMetadataListRequestQuery } from '../../../../common/endpoint/schema/metadata';
import { EndpointError } from '../../../../common/endpoint/errors';
import { EndpointFleetServicesInterface } from '../fleet/endpoint_fleet_services_factory';

type AgentPolicyWithPackagePolicies = Omit<AgentPolicy, 'package_policies'> & {
  package_policies: PackagePolicy[];
};

const isAgentPolicyWithPackagePolicies = (
  agentPolicy: AgentPolicy | AgentPolicyWithPackagePolicies
): agentPolicy is AgentPolicyWithPackagePolicies => {
  if (
    agentPolicy.package_policies.length === 0 ||
    typeof agentPolicy.package_policies[0] !== 'string'
  ) {
    return true;
  }

  return false;
};

export class EndpointMetadataService {
  /**
   * For internal use only by the `this.DANGEROUS_INTERNAL_SO_CLIENT`
   * @deprecated
   */
  private __DANGEROUS_INTERNAL_SO_CLIENT: SavedObjectsClientContract | undefined;

  constructor(
    private savedObjectsStart: SavedObjectsServiceStart,
    private readonly agentPolicyService: AgentPolicyServiceInterface,
    private readonly packagePolicyService: PackagePolicyServiceInterface,
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
    const endpointMetadata = queryResponseToHostResult(queryResult).result;

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

    return queryResponseToHostListResult(searchResult).resultList;
  }

  /**
   * Retrieve a single endpoint host metadata along with fleet information
   *
   * @param esClient Elasticsearch Client (usually scoped to the user's context)
   * @param fleetServices
   * @param endpointId the endpoint id (from `agent.id`)
   *
   * @throws
   */
  async getEnrichedHostMetadata(
    esClient: ElasticsearchClient,
    fleetServices: EndpointFleetServicesInterface,
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

      fleetAgent = await this.getFleetAgent(fleetServices.agent, fleetAgentId);
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

    return this.enrichHostMetadata(fleetServices, endpointMetadata, fleetAgent);
  }

  /**
   * Enriches a host metadata document with data from fleet
   * @param fleetServices
   * @param endpointMetadata
   * @param _fleetAgent
   * @param _fleetAgentPolicy
   * @param _endpointPackagePolicy
   * @private
   */
  // eslint-disable-next-line complexity
  private async enrichHostMetadata(
    fleetServices: EndpointFleetServicesInterface,
    endpointMetadata: HostMetadata,
    /**
     * If undefined, it will be retrieved from Fleet using the ID in the endpointMetadata.
     * If passing in an `Agent` record that was retrieved from the Endpoint Unified transform index,
     * ensure that its `.status` property is properly set to the calculated value done by
     * fleet `getAgentStatus()` method.
     */
    _fleetAgent?: MaybeImmutable<Agent>,
    /** If undefined, it will be retrieved from Fleet using data from the endpointMetadata  */
    _fleetAgentPolicy?:
      | MaybeImmutable<AgentPolicy>
      | MaybeImmutable<AgentPolicyWithPackagePolicies>,
    /** If undefined, it will be retrieved from Fleet using the ID in the endpointMetadata */
    _endpointPackagePolicy?: MaybeImmutable<PackagePolicy>
  ): Promise<HostInfo> {
    let fleetAgentId = endpointMetadata.elastic.agent.id;
    // casting below is done only to remove `immutable<>` from the object if they are defined as such
    let fleetAgent = _fleetAgent as Agent | undefined;
    let fleetAgentPolicy = _fleetAgentPolicy as
      | AgentPolicy
      | AgentPolicyWithPackagePolicies
      | undefined;
    let endpointPackagePolicy = _endpointPackagePolicy as PackagePolicy | undefined;

    if (!fleetAgent) {
      try {
        if (!fleetAgentId) {
          fleetAgentId = endpointMetadata.agent.id;
          this.logger?.warn(
            new EndpointError(
              `Missing elastic fleet agent id on Endpoint Metadata doc - using Endpoint agent.id instead: ${fleetAgentId}`
            )
          );
        }

        fleetAgent = await this.getFleetAgent(fleetServices.agent, fleetAgentId);
      } catch (error) {
        if (error instanceof FleetAgentNotFoundError) {
          this.logger?.warn(`agent with id ${fleetAgentId} not found`);
        } else {
          throw error;
        }
      }
    }

    if (!fleetAgentPolicy && fleetAgent) {
      try {
        fleetAgentPolicy = await this.getFleetAgentPolicy(fleetAgent.policy_id ?? '');
      } catch (error) {
        this.logger?.error(error);
      }
    }

    // The fleetAgentPolicy might have the endpoint policy in the `package_policies`, lets check that first
    if (
      !endpointPackagePolicy &&
      fleetAgentPolicy &&
      isAgentPolicyWithPackagePolicies(fleetAgentPolicy)
    ) {
      endpointPackagePolicy = fleetAgentPolicy.package_policies.find(
        (policy) => policy.package?.name === 'endpoint'
      );
    }

    // if we still don't have an endpoint package policy, try retrieving it from fleet
    if (!endpointPackagePolicy) {
      try {
        endpointPackagePolicy = await this.getFleetEndpointPackagePolicy(
          endpointMetadata.Endpoint.policy.applied.id
        );
      } catch (error) {
        this.logger?.error(error);
      }
    }

    return {
      metadata: endpointMetadata,
      host_status: fleetAgent
        ? // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          fleetAgentStatusToEndpointHostStatus(fleetAgent.status!)
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
  }

  /**
   * Retrieve a single Fleet Agent data
   *
   * @param fleetAgentService
   * @param agentId The elastic agent id (`from `elastic.agent.id`)
   */
  async getFleetAgent(
    fleetAgentService: EndpointFleetServicesInterface['agent'],
    agentId: string
  ): Promise<Agent> {
    try {
      return await fleetAgentService.getAgent(agentId);
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

  /**
   * Retrieve an endpoint policy from fleet
   * @param endpointPolicyId
   * @throws
   */
  async getFleetEndpointPackagePolicy(endpointPolicyId: string): Promise<PolicyData> {
    const endpointPackagePolicy = await this.packagePolicyService
      .get(this.DANGEROUS_INTERNAL_SO_CLIENT, endpointPolicyId)
      .catch(catchAndWrapError);

    if (!endpointPackagePolicy) {
      throw new FleetEndpointPackagePolicyNotFoundError(
        `Fleet endpoint package policy with id ${endpointPolicyId} not found`
      );
    }

    return endpointPackagePolicy as PolicyData;
  }

  /**
   * Returns whether the united metadata index exists
   *
   * @param esClient
   *
   * @throws
   */
  async doesUnitedIndexExist(esClient: ElasticsearchClient): Promise<boolean> {
    try {
      await esClient.search({
        index: METADATA_UNITED_INDEX,
        size: 1,
      });
      return true;
    } catch (error) {
      const errorType = error?.meta?.body?.error?.type ?? '';
      // only index not found is expected
      if (errorType !== 'index_not_found_exception') {
        const err = wrapErrorIfNeeded(error);
        this.logger?.error(err);
        throw err;
      }
    }

    return false;
  }

  /**
   * Retrieve list of host metadata. Only supports new united index.
   *
   * @param esClient
   * @param queryOptions
   *
   * @throws
   */
  async getHostMetadataList(
    esClient: ElasticsearchClient,
    fleetServices: EndpointFleetServicesInterface,
    queryOptions: GetMetadataListRequestQuery
  ): Promise<Pick<MetadataListResponse, 'data' | 'total'>> {
    const endpointPolicies = await this.getAllEndpointPackagePolicies();
    const endpointPolicyIds = endpointPolicies.map((policy) => policy.policy_id);
    const unitedIndexQuery = await buildUnitedIndexQuery(queryOptions, endpointPolicyIds);

    let unitedMetadataQueryResponse: SearchResponse<UnitedAgentMetadata>;

    try {
      unitedMetadataQueryResponse = await esClient.search<UnitedAgentMetadata>(unitedIndexQuery);
    } catch (error) {
      const err = wrapErrorIfNeeded(error);
      this.logger?.error(err);
      throw err;
    }

    const { hits: docs, total: docsCount } = unitedMetadataQueryResponse?.hits || {};
    const agentPolicyIds: string[] = docs.map((doc) => doc._source?.united?.agent?.policy_id ?? '');

    const agentPolicies =
      (await this.agentPolicyService
        .getByIds(this.DANGEROUS_INTERNAL_SO_CLIENT, agentPolicyIds)
        .catch(catchAndWrapError)) ?? [];

    const agentPoliciesMap: Record<string, AgentPolicy> = agentPolicies.reduce(
      (acc, agentPolicy) => ({
        ...acc,
        [agentPolicy.id]: {
          ...agentPolicy,
        },
      }),
      {}
    );

    const endpointPoliciesMap: Record<string, PackagePolicy> = endpointPolicies.reduce(
      (acc, packagePolicy) => ({
        ...acc,
        [packagePolicy.policy_id]: packagePolicy,
      }),
      {}
    );

    const hosts: HostInfo[] = [];

    for (const doc of docs) {
      const { endpoint: metadata, agent: _agent } = doc?._source?.united ?? {};

      if (metadata && _agent) {
        // `_agent: Agent` here is the record stored in the unified index, whose `status` **IS NOT** the
        // calculated status returned by the normal fleet API/Service. So lets calculated it before
        // passing this on to other methods that expect an `Agent` type
        const agent: typeof _agent = {
          ..._agent,
          // Casting below necessary to remove `Immutable<>` from the type
          status: getAgentStatus(_agent as Agent),
        };

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const agentPolicy = agentPoliciesMap[agent.policy_id!];
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const endpointPolicy = endpointPoliciesMap[agent.policy_id!];

        hosts.push(
          await this.enrichHostMetadata(fleetServices, metadata, agent, agentPolicy, endpointPolicy)
        );
      }
    }

    return {
      data: hosts,
      total: (docsCount as unknown as SearchTotalHits).value,
    };
  }

  async getAllEndpointPackagePolicies() {
    return getAllEndpointPackagePolicies(
      this.packagePolicyService,
      this.DANGEROUS_INTERNAL_SO_CLIENT
    );
  }
}
