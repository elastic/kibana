/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  KibanaRequest,
  Logger,
  SavedObjectsServiceStart,
  SavedObjectsClientContract,
} from 'src/core/server';
import { ExceptionListClient } from '../../../lists/server';
import {
  CasesClient,
  PluginStartContract as CasesPluginStartContract,
} from '../../../cases/server';
import { SecurityPluginStart } from '../../../security/server';
import {
  AgentService,
  FleetStartContract,
  AgentPolicyServiceInterface,
  PackagePolicyServiceInterface,
} from '../../../fleet/server';
import { PluginStartContract as AlertsPluginStartContract } from '../../../alerting/server';
import {
  getPackagePolicyCreateCallback,
  getPackagePolicyUpdateCallback,
} from '../fleet_integration/fleet_integration';
import { ManifestManager } from './services/artifacts';
import { AppClientFactory } from '../client';
import { ConfigType } from '../config';
import { LicenseService } from '../../common/license';
import {
  ExperimentalFeatures,
  parseExperimentalConfigValue,
} from '../../common/experimental_features';

export type EndpointAppContextServiceStartContract = Partial<
  Pick<
    FleetStartContract,
    'agentService' | 'packageService' | 'packagePolicyService' | 'agentPolicyService'
  >
> & {
  logger: Logger;
  manifestManager?: ManifestManager;
  appClientFactory: AppClientFactory;
  security: SecurityPluginStart;
  alerting: AlertsPluginStartContract;
  config: ConfigType;
  registerIngestCallback?: FleetStartContract['registerExternalCallback'];
  savedObjectsStart: SavedObjectsServiceStart;
  licenseService: LicenseService;
  exceptionListsClient: ExceptionListClient | undefined;
  cases: CasesPluginStartContract | undefined;
};

/**
 * A singleton that holds shared services that are initialized during the start up phase
 * of the plugin lifecycle. And stop during the stop phase, if needed.
 */
export class EndpointAppContextService {
  private agentService: AgentService | undefined;
  private manifestManager: ManifestManager | undefined;
  private packagePolicyService: PackagePolicyServiceInterface | undefined;
  private agentPolicyService: AgentPolicyServiceInterface | undefined;
  private savedObjectsStart: SavedObjectsServiceStart | undefined;
  private config: ConfigType | undefined;
  private license: LicenseService | undefined;
  public security: SecurityPluginStart | undefined;
  private cases: CasesPluginStartContract | undefined;

  private experimentalFeatures: ExperimentalFeatures | undefined;

  public start(dependencies: EndpointAppContextServiceStartContract) {
    this.agentService = dependencies.agentService;
    this.packagePolicyService = dependencies.packagePolicyService;
    this.agentPolicyService = dependencies.agentPolicyService;
    this.manifestManager = dependencies.manifestManager;
    this.savedObjectsStart = dependencies.savedObjectsStart;
    this.config = dependencies.config;
    this.license = dependencies.licenseService;
    this.security = dependencies.security;
    this.cases = dependencies.cases;

    this.experimentalFeatures = parseExperimentalConfigValue(this.config.enableExperimental);

    if (this.manifestManager && dependencies.registerIngestCallback) {
      dependencies.registerIngestCallback(
        'packagePolicyCreate',
        getPackagePolicyCreateCallback(
          dependencies.logger,
          this.manifestManager,
          dependencies.appClientFactory,
          dependencies.config.maxTimelineImportExportSize,
          dependencies.security,
          dependencies.alerting,
          dependencies.licenseService,
          dependencies.exceptionListsClient
        )
      );

      dependencies.registerIngestCallback(
        'packagePolicyUpdate',
        getPackagePolicyUpdateCallback(dependencies.logger, dependencies.licenseService)
      );
    }
  }

  public stop() {}

  public getExperimentalFeatures(): Readonly<ExperimentalFeatures> | undefined {
    return this.experimentalFeatures;
  }

  public getAgentService(): AgentService | undefined {
    return this.agentService;
  }

  public getPackagePolicyService(): PackagePolicyServiceInterface | undefined {
    return this.packagePolicyService;
  }

  public getAgentPolicyService(): AgentPolicyServiceInterface | undefined {
    return this.agentPolicyService;
  }

  public getManifestManager(): ManifestManager | undefined {
    return this.manifestManager;
  }

  public getScopedSavedObjectsClient(req: KibanaRequest): SavedObjectsClientContract {
    if (!this.savedObjectsStart) {
      throw new Error(`must call start on ${EndpointAppContextService.name} to call getter`);
    }
    return this.savedObjectsStart.getScopedClient(req, { excludedWrappers: ['security'] });
  }

  public getLicenseService(): LicenseService {
    if (!this.license) {
      throw new Error(`must call start on ${EndpointAppContextService.name} to call getter`);
    }
    return this.license;
  }

  public async getCasesClient(req: KibanaRequest): Promise<CasesClient> {
    if (!this.cases) {
      throw new Error(`must call start on ${EndpointAppContextService.name} to call getter`);
    }
    return this.cases.getCasesClientWithRequest(req);
  }
}
