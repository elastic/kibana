/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract, SavedObjectsServiceStart } from '@kbn/core/server';
import type {
  AgentClient,
  AgentPolicyServiceInterface,
  FleetStartContract,
  PackagePolicyClient,
  PackageClient,
} from '@kbn/fleet-plugin/server';
import { PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common';
import { createInternalSoClient } from '../../utils/create_internal_so_client';
import { createInternalReadonlySoClient } from '../../utils/create_internal_readonly_so_client';

export interface EndpointFleetServicesFactoryInterface {
  asInternalUser(): EndpointInternalFleetServicesInterface;
}

export class EndpointFleetServicesFactory implements EndpointFleetServicesFactoryInterface {
  constructor(
    private readonly fleetDependencies: Pick<
      FleetStartContract,
      'agentService' | 'packageService' | 'packagePolicyService' | 'agentPolicyService'
    >,
    private savedObjectsStart: SavedObjectsServiceStart
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

      internalReadonlySoClient: createInternalReadonlySoClient(this.savedObjectsStart),
      internalSoClient: createInternalSoClient(this.savedObjectsStart),
    };
  }
}

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
  /**
   * An internal SO client (readonly) that can be used with the Fleet services that require it
   */
  internalReadonlySoClient: SavedObjectsClientContract;

  /** Internal SO client. USE ONLY WHEN ABSOLUTELY NEEDED. Else, use the `internalReadonlySoClient` */
  internalSoClient: SavedObjectsClientContract;
}
