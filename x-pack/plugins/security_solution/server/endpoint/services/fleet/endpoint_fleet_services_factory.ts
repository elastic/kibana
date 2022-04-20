/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  KibanaRequest,
  SavedObjectsClientContract,
  SavedObjectsServiceStart,
} from '@kbn/core/server';
import type {
  AgentClient,
  AgentPolicyServiceInterface,
  FleetStartContract,
  PackagePolicyServiceInterface,
  PackageClient,
} from '@kbn/fleet-plugin/server';
import { createInternalReadonlySoClient } from '../../utils/create_internal_readonly_so_client';

export interface EndpointFleetServicesFactoryInterface {
  asScoped(req: KibanaRequest): EndpointScopedFleetServicesInterface;

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

  asScoped(req: KibanaRequest): EndpointScopedFleetServicesInterface {
    const {
      agentPolicyService: agentPolicy,
      packagePolicyService: packagePolicy,
      agentService,
      packageService,
    } = this.fleetDependencies;

    return {
      agent: agentService.asScoped(req),
      agentPolicy,
      packages: packageService.asScoped(req),
      packagePolicy,

      asInternal: this.asInternalUser.bind(this),
    };
  }

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

      asScoped: this.asScoped.bind(this),
      internalReadonlySoClient: createInternalReadonlySoClient(this.savedObjectsStart),
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
  packagePolicy: PackagePolicyServiceInterface;
}

export interface EndpointScopedFleetServicesInterface extends EndpointFleetServicesInterface {
  /**
   * get internal fleet services instance
   */
  asInternal: EndpointFleetServicesFactoryInterface['asInternalUser'];
}

export interface EndpointInternalFleetServicesInterface extends EndpointFleetServicesInterface {
  /**
   * get scoped endpoint fleet services instance
   */
  asScoped: EndpointFleetServicesFactoryInterface['asScoped'];

  /**
   * An internal SO client (readonly) that can be used with the Fleet services that require it
   */
  internalReadonlySoClient: SavedObjectsClientContract;
}
