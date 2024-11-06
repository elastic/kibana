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
import { PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common';
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
}

export interface EndpointInternalFleetServicesInterface extends EndpointFleetServicesInterface {
  savedObjects: SavedObjectsClientFactory;
}

export interface EndpointFleetServicesFactoryInterface {
  asInternalUser(): EndpointInternalFleetServicesInterface;
}

/**
 * Provides centralized way to get all services for Fleet and access internal saved object clients
 */
export class EndpointFleetServicesFactory implements EndpointFleetServicesFactoryInterface {
  constructor(
    private readonly fleetDependencies: FleetStartContract,
    private readonly savedObjects: SavedObjectsClientFactory
  ) {}

  asInternalUser(): EndpointInternalFleetServicesInterface {
    const {
      agentPolicyService: agentPolicy,
      packagePolicyService: packagePolicy,
      agentService,
      packageService,
    } = this.fleetDependencies;

    return {
      agent: agentService.asInternalUser,
      agentPolicy,

      packages: packageService.asInternalUser,
      packagePolicy,

      endpointPolicyKuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name: "endpoint"`,

      savedObjects: this.savedObjects,
    };
  }
}
