/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AgentService,
  FleetStartContract,
  PackageService,
  AgentPolicyServiceInterface,
  PackagePolicyServiceInterface,
} from '../../../fleet/server';

export type CspAppServicesStartContract = Partial<
  Pick<
    FleetStartContract,
    'agentService' | 'packageService' | 'packagePolicyService' | 'agentPolicyService'
  >
>;

export class CspAppService {
  private agentService: AgentService | undefined;
  private packageService: PackageService | undefined;
  private packagePolicyService: PackagePolicyServiceInterface | undefined;
  private agentPolicyService: AgentPolicyServiceInterface | undefined;

  public start(dependencies: CspAppServicesStartContract) {
    this.agentService = dependencies.agentService;
    this.packageService = dependencies.packageService;
    this.packagePolicyService = dependencies.packagePolicyService;
    this.agentPolicyService = dependencies.agentPolicyService;
  }

  public stop() {}

  public getAgentService(): AgentService | undefined {
    return this.agentService;
  }

  public getPackageService(): PackageService | undefined {
    return this.packageService;
  }

  public getPackagePolicyService(): PackagePolicyServiceInterface | undefined {
    return this.packagePolicyService;
  }

  public getAgentPolicyService(): AgentPolicyServiceInterface | undefined {
    return this.agentPolicyService;
  }
}
