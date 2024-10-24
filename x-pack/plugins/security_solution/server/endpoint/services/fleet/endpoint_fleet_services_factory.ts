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
import { PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import {
  AgentPolicyNotFoundError,
  PackagePolicyNotFoundError,
} from '@kbn/fleet-plugin/server/errors';
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
    private readonly savedObjects: SavedObjectsClientFactory
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

    return {
      agent,
      agentPolicy,

      packages: packageService.asInternalUser,
      packagePolicy,

      savedObjects: this.savedObjects,

      endpointPolicyKuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name: "endpoint"`,
      ensureInCurrentSpace,
    };
  }
}
