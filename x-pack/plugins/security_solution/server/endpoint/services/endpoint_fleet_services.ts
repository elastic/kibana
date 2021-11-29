/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest } from 'kibana/server';
import type {
  AgentClient,
  AgentPolicyServiceInterface,
  FleetStartContract,
  PackagePolicyServiceInterface,
  PackageService,
} from '../../../../fleet/server';

export interface EndpointFleetServicesFactoryInterface {
  asScoped(req: KibanaRequest): EndpointScopedFleetServicesInterface;

  asInternalUser(): EndpointInternalFleetServicesInterface;
}

export class EndpointFleetServicesFactory implements EndpointFleetServicesFactoryInterface {
  constructor(
    private readonly fleetDependencies: Pick<
      FleetStartContract,
      'agentService' | 'packageService' | 'packagePolicyService' | 'agentPolicyService'
    >
  ) {}

  asScoped(req: KibanaRequest): EndpointScopedFleetServicesInterface {
    const {
      agentPolicyService: agentPolicy,
      packagePolicyService: packagePolicy,
      agentService,
      packageService: packages,
    } = this.fleetDependencies;

    return {
      agent: agentService.asScoped(req),
      agentPolicy,
      packages,
      packagePolicy,

      asInternal: this.asInternalUser.bind(this),
    };
  }

  asInternalUser(): EndpointInternalFleetServicesInterface {
    const {
      agentPolicyService: agentPolicy,
      packagePolicyService: packagePolicy,
      agentService,
      packageService: packages,
    } = this.fleetDependencies;

    return {
      agent: agentService.asInternalUser,
      agentPolicy,
      packages,
      packagePolicy,

      asScoped: this.asScoped.bind(this),
    };
  }
}

/**
 * The set of Fleet services used by Endpoint
 */
export interface EndpointFleetServicesInterface {
  agent: AgentClient;
  agentPolicy: AgentPolicyServiceInterface;
  packages: PackageService;
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
}
