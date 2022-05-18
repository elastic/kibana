/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AgentService,
  PackageService,
  AgentPolicyServiceInterface,
  PackagePolicyServiceInterface,
} from '@kbn/fleet-plugin/server';

export interface CspAppServiceDependencies {
  packageService: PackageService;
  agentService: AgentService;
  packagePolicyService: PackagePolicyServiceInterface;
  agentPolicyService: AgentPolicyServiceInterface;
}

export class CspAppService {
  public agentService: AgentService | undefined;
  public packageService: PackageService | undefined;
  public packagePolicyService: PackagePolicyServiceInterface | undefined;
  public agentPolicyService: AgentPolicyServiceInterface | undefined;

  public start(dependencies: CspAppServiceDependencies) {
    this.agentService = dependencies.agentService;
    this.packageService = dependencies.packageService;
    this.packagePolicyService = dependencies.packagePolicyService;
    this.agentPolicyService = dependencies.agentPolicyService;
  }

  public stop() {}
}
