/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, Logger, LoggerFactory } from '../../../../../src/core/server';
// import { SecurityPluginStart } from '../../../security/server';
import {
  AgentService,
  FleetStartContract,
  PackageService,
  AgentPolicyServiceInterface,
  PackagePolicyServiceInterface,
} from '../../../fleet/server';
// import { ConfigType } from '../config';

export type CspAppContextServiceStartContract = Partial<
  Pick<
    FleetStartContract,
    'agentService' | 'packageService' | 'packagePolicyService' | 'agentPolicyService'
  >
> & {
  logger: Logger;
  // config: ConfigType;
  registerIngestCallback?: FleetStartContract['registerExternalCallback'];
};

/**
 * A singleton that holds shared services that are initialized during the start up phase
 * of the plugin lifecycle. And stop during the stop phase, if needed.
 */
// export interface CspAppContext {
//   // logFactory: LoggerFactory;
//   // config(): ConfigType;
//   // security: SecurityPluginStart;
//   getStartServices: CoreSetup['getStartServices'];
//   /**
//    * Object readiness is tied to plugin start method
//    */
//   service: CspAppContextService;
// }
import { ConfigType } from '../plugin';

export class CspAppContextService {
  private agentService: AgentService | undefined;
  private packageService: PackageService | undefined;
  private packagePolicyService: PackagePolicyServiceInterface | undefined;
  private agentPolicyService: AgentPolicyServiceInterface | undefined;

  // public start(dependencies: CspAppContextServiceStartContract) {

  public start(dependencies: CspAppContextServiceStartContract) {
    this.agentService = dependencies.agentService;
    this.packageService = dependencies.packageService;
    this.packagePolicyService = dependencies.packagePolicyService;
    this.agentPolicyService = dependencies.agentPolicyService;
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
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

/**
 * The context for Csp app.
 */
export interface CspAppContext {
  // logFactory: LoggerFactory;
  // config(): ConfigType;
  // security: SecurityPluginStart;
  getStartServices: CoreSetup['getStartServices'];
  /**
   * Object readiness is tied to plugin start method
   */
  service: CspAppContextService;
}
