/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest, Logger } from 'src/core/server';
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
  getPackagePolicyDeleteCallback,
} from '../fleet_integration/fleet_integration';
import { ManifestManager } from './services/artifacts';
import { ConfigType } from '../config';
import { IRequestContextFactory } from '../request_context_factory';
import { LicenseService } from '../../common/license';
import { ExperimentalFeatures } from '../../common/experimental_features';
import { EndpointMetadataService } from './services/metadata';
import {
  EndpointAppContentServicesNotSetUpError,
  EndpointAppContentServicesNotStartedError,
} from './errors';

export interface EndpointAppContextServiceSetupContract {
  securitySolutionRequestContextFactory: IRequestContextFactory;
}

export type EndpointAppContextServiceStartContract = Partial<
  Pick<
    FleetStartContract,
    'agentService' | 'packageService' | 'packagePolicyService' | 'agentPolicyService'
  >
> & {
  logger: Logger;
  endpointMetadataService: EndpointMetadataService;
  manifestManager?: ManifestManager;
  security: SecurityPluginStart;
  alerting: AlertsPluginStartContract;
  config: ConfigType;
  registerIngestCallback?: FleetStartContract['registerExternalCallback'];
  licenseService: LicenseService;
  exceptionListsClient: ExceptionListClient | undefined;
  cases: CasesPluginStartContract | undefined;
};

/**
 * A singleton that holds shared services that are initialized during the start up phase
 * of the plugin lifecycle. And stop during the stop phase, if needed.
 */
export class EndpointAppContextService {
  private setupDependencies: EndpointAppContextServiceSetupContract | null = null;
  private startDependencies: EndpointAppContextServiceStartContract | null = null;
  public security: SecurityPluginStart | undefined;

  public setup(dependencies: EndpointAppContextServiceSetupContract) {
    this.setupDependencies = dependencies;
  }

  public start(dependencies: EndpointAppContextServiceStartContract) {
    if (!this.setupDependencies) {
      throw new EndpointAppContentServicesNotSetUpError();
    }

    this.startDependencies = dependencies;
    this.security = dependencies.security;

    if (dependencies.registerIngestCallback && dependencies.manifestManager) {
      dependencies.registerIngestCallback(
        'packagePolicyCreate',
        getPackagePolicyCreateCallback(
          dependencies.logger,
          dependencies.manifestManager,
          this.setupDependencies.securitySolutionRequestContextFactory,
          dependencies.alerting,
          dependencies.licenseService,
          dependencies.exceptionListsClient
        )
      );

      dependencies.registerIngestCallback(
        'packagePolicyUpdate',
        getPackagePolicyUpdateCallback(dependencies.logger, dependencies.licenseService)
      );

      dependencies.registerIngestCallback(
        'postPackagePolicyDelete',
        getPackagePolicyDeleteCallback(
          dependencies.exceptionListsClient,
          dependencies.config.experimentalFeatures
        )
      );
    }
  }

  public stop() {}

  public getExperimentalFeatures(): Readonly<ExperimentalFeatures> | undefined {
    return this.startDependencies?.config.experimentalFeatures;
  }

  public getEndpointMetadataService(): EndpointMetadataService {
    if (this.startDependencies == null) {
      throw new EndpointAppContentServicesNotStartedError();
    }
    return this.startDependencies.endpointMetadataService;
  }

  public getAgentService(): AgentService | undefined {
    return this.startDependencies?.agentService;
  }

  public getPackagePolicyService(): PackagePolicyServiceInterface {
    if (!this.startDependencies?.packagePolicyService) {
      throw new EndpointAppContentServicesNotStartedError();
    }
    return this.startDependencies?.packagePolicyService;
  }

  public getAgentPolicyService(): AgentPolicyServiceInterface | undefined {
    return this.startDependencies?.agentPolicyService;
  }

  public getManifestManager(): ManifestManager | undefined {
    return this.startDependencies?.manifestManager;
  }

  public getLicenseService(): LicenseService {
    if (this.startDependencies == null) {
      throw new EndpointAppContentServicesNotStartedError();
    }
    return this.startDependencies.licenseService;
  }

  public async getCasesClient(req: KibanaRequest): Promise<CasesClient> {
    if (this.startDependencies?.cases == null) {
      throw new EndpointAppContentServicesNotStartedError();
    }
    return this.startDependencies.cases.getCasesClientWithRequest(req);
  }
}
