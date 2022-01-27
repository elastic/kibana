/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, Logger, LoggerFactory } from '../../../../../src/core/server';
import { SecurityPluginStart } from '../../../security/server';
import {
  AgentService,
  FleetStartContract,
  PackageService,
  AgentPolicyServiceInterface,
  PackagePolicyServiceInterface,
} from '../../../fleet/server';
import { ConfigType } from '../config';
import { TelemetryEventsSender } from './telemetry/sender';

export type OsqueryAppContextServiceStartContract = Partial<
  Pick<
    FleetStartContract,
    'agentService' | 'packageService' | 'packagePolicyService' | 'agentPolicyService'
  >
> & {
  logger: Logger;
  config: ConfigType;
  registerIngestCallback?: FleetStartContract['registerExternalCallback'];
};

/**
 * A singleton that holds shared services that are initialized during the start up phase
 * of the plugin lifecycle. And stop during the stop phase, if needed.
 */
export class OsqueryAppContextService {
  private agentService: AgentService | undefined;
  private packageService: PackageService | undefined;
  private packagePolicyService: PackagePolicyServiceInterface | undefined;
  private agentPolicyService: AgentPolicyServiceInterface | undefined;

  public start(dependencies: OsqueryAppContextServiceStartContract) {
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
 * The context for Osquery app.
 */
export interface OsqueryAppContext {
  logFactory: LoggerFactory;
  config(): ConfigType;
  security: SecurityPluginStart;
  getStartServices: CoreSetup['getStartServices'];
  telemetryEventsSender: TelemetryEventsSender;
  /**
   * Object readiness is tied to plugin start method
   */
  service: OsqueryAppContextService;
}
