/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AgentClient,
  AgentPolicyServiceInterface,
  FleetStartContract,
  PackagePolicyClient,
  PackageClient,
} from '@kbn/fleet-plugin/server';
import { AgentNotFoundError } from '@kbn/fleet-plugin/server';
import type { AgentPolicy } from '@kbn/fleet-plugin/common';
import { PACKAGE_POLICY_SAVED_OBJECT_TYPE, type PackagePolicy } from '@kbn/fleet-plugin/common';
import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import {
  AgentPolicyNotFoundError,
  PackagePolicyNotFoundError,
} from '@kbn/fleet-plugin/server/errors';
import { stringify } from '../../utils/stringify';
import { NotFoundError } from '../../errors';
import type { SavedObjectsClientFactory } from '../saved_objects';

/**
 * The set of Fleet services used by Endpoint
 */
export interface EndpointFleetServicesInterface {
  agent: AgentClient;
  agentPolicy: AgentPolicyServiceInterface;
  packages: PackageClient;
  packagePolicy: PackagePolicyClient;
  /** The `kuery` that can be used to filter for Endpoint integration policies */
  endpointPolicyKuery: string;

  /**
   * Will check the data provided to ensure it is visible for the current space. Supports
   * several types of data (ex. integration policies, agent policies, etc)
   */
  ensureInCurrentSpace(options: EnsureInCurrentSpaceOptions): Promise<void>;

  /**
   * Retrieves the `namespace` for assigned to Endpoint Integration Policies
   * @param options
   */
  getPolicyNamespace(
    options: Pick<FetchEndpointPolicyNamespaceOptions, 'integrationPolicies'>
  ): Promise<FetchEndpointPolicyNamespaceResponse>;
}

type EnsureInCurrentSpaceOptions = Partial<{
  agentIds: string[];
  agentPolicyIds: string[];
  integrationPolicyIds: string[];
}>;

export interface EndpointInternalFleetServicesInterface extends EndpointFleetServicesInterface {
  savedObjects: SavedObjectsClientFactory;
}

export interface EndpointFleetServicesFactoryInterface {
  asInternalUser(spaceId?: string): EndpointInternalFleetServicesInterface;
}

/**
 * Provides centralized way to get all services for Fleet and access internal saved object clients
 */
export class EndpointFleetServicesFactory implements EndpointFleetServicesFactoryInterface {
  constructor(
    private readonly fleetDependencies: FleetStartContract,
    private readonly savedObjects: SavedObjectsClientFactory,
    private readonly logger: Logger
  ) {}

  asInternalUser(spaceId?: string): EndpointInternalFleetServicesInterface {
    const {
      agentPolicyService: agentPolicy,
      packagePolicyService: packagePolicy,
      agentService,
      packageService,
    } = this.fleetDependencies;
    const agent = spaceId
      ? agentService.asInternalScopedUser(spaceId)
      : agentService.asInternalUser;

    // Lazily Initialized at the time it is needed
    let soClient: SavedObjectsClientContract;

    const ensureInCurrentSpace: EndpointFleetServicesInterface['ensureInCurrentSpace'] = async ({
      integrationPolicyIds = [],
      agentPolicyIds = [],
      agentIds = [],
    }): Promise<void> => {
      if (!soClient) {
        soClient = this.savedObjects.createInternalScopedSoClient({ spaceId });
      }

      const handlePromiseErrors = (err: Error): never => {
        // We wrap the error with our own Error class so that the API can property return a 404
        if (
          err instanceof AgentNotFoundError ||
          err instanceof AgentPolicyNotFoundError ||
          err instanceof PackagePolicyNotFoundError
        ) {
          throw new NotFoundError(err.message, err);
        }

        throw err;
      };

      await Promise.all([
        agentIds.length ? agent.getByIds(agentIds).catch(handlePromiseErrors) : null,

        agentPolicyIds.length
          ? agentPolicy.getByIds(soClient, agentPolicyIds).catch(handlePromiseErrors)
          : null,

        integrationPolicyIds.length
          ? packagePolicy.getByIDs(soClient, integrationPolicyIds).catch(handlePromiseErrors)
          : null,
      ]);
    };

    const getPolicyNamespace: EndpointFleetServicesInterface['getPolicyNamespace'] = async (
      options
    ) => {
      if (!soClient) {
        soClient = this.savedObjects.createInternalScopedSoClient({ spaceId });
      }

      return fetchEndpointPolicyNamespace({
        ...options,
        soClient,
        logger: this.logger,
        packagePolicyService: packagePolicy,
        agentPolicyService: agentPolicy,
      });
    };

    return {
      agent,
      agentPolicy,

      packages: packageService.asInternalUser,
      packagePolicy,

      savedObjects: this.savedObjects,

      endpointPolicyKuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name: "endpoint"`,
      ensureInCurrentSpace,
      getPolicyNamespace,
    };
  }
}

interface FetchEndpointPolicyNamespaceOptions {
  logger: Logger;
  soClient: SavedObjectsClientContract;
  packagePolicyService: PackagePolicyClient;
  agentPolicyService: AgentPolicyServiceInterface;
  /** A list of integration policies IDs */
  integrationPolicies: PackagePolicy[];
}

interface FetchEndpointPolicyNamespaceResponse {
  integrationPolicy: Record<string, string[]>;
}

const fetchEndpointPolicyNamespace = async ({
  logger,
  soClient,
  packagePolicyService,
  agentPolicyService,
  integrationPolicies,
}: FetchEndpointPolicyNamespaceOptions): Promise<FetchEndpointPolicyNamespaceResponse> => {
  const response: FetchEndpointPolicyNamespaceResponse = {
    integrationPolicy: {},
  };
  const agentPolicyIdsToRetrieve = new Set<string>();
  const retrievedIntegrationPolicies: Record<string, PackagePolicy> = {};
  const retrievedAgentPolicies: Record<string, AgentPolicy> = {};

  if (integrationPolicies.length > 0) {
    logger.debug(
      () => `Retrieving package policies from fleet for:\n${stringify(integrationPolicies)}`
    );
    const packagePolicies =
      (await packagePolicyService.getByIDs(soClient, integrationPolicies)) ?? [];

    logger.trace(() => `Fleet package policies retrieved:\n${stringify(packagePolicies)}`);

    for (const packagePolicy of packagePolicies) {
      retrievedIntegrationPolicies[packagePolicy.id] = packagePolicy;

      // Integration policy does not have an explicit namespace, which means it
      // inherits it from the associated agent policies, so lets retrieve those
      if (!packagePolicy.namespace) {
        packagePolicy.policy_ids.forEach((agentPolicyId) => {
          agentPolicyIdsToRetrieve.add(agentPolicyId);
        });
      }
    }
  }

  if (agentPolicyIdsToRetrieve.size > 0) {
    const ids = Array.from(agentPolicyIdsToRetrieve);

    logger.debug(() => `Retrieving agent policies from fleeet for:\n${stringify(ids)}`);

    const agentPolicies = await agentPolicyService.getByIds(soClient, ids);

    logger.trace(() => `Fleet agent policies retrieved:\n${stringify(agentPolicies)}`);

    for (const agentPolicy of agentPolicies) {
      retrievedAgentPolicies[agentPolicy.id] = agentPolicy;
    }
  }

  for (const integrationPolicyId of integrationPolicies) {
    response.integrationPolicy[integrationPolicyId] = retrievedIntegrationPolicies[
      integrationPolicyId
    ].namespace
      ? [retrievedIntegrationPolicies[integrationPolicyId].namespace]
      : retrievedIntegrationPolicies[integrationPolicyId].policy_ids.map((agentPolicyId) => {
          return retrievedAgentPolicies[agentPolicyId].namespace;
        });
  }

  logger.debug(() => `Policy namespaces:\n${stringify(response)}`);

  return response;
};
