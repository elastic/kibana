/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { ExceptionListClient, ListsServerExtensionRegistrar } from '@kbn/lists-plugin/server';
import type {
  CasesClient,
  PluginStartContract as CasesPluginStartContract,
} from '@kbn/cases-plugin/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import type {
  AgentService,
  FleetStartContract,
  AgentPolicyServiceInterface,
} from '@kbn/fleet-plugin/server';
import type { PluginStartContract as AlertsPluginStartContract } from '@kbn/alerting-plugin/server';
import { ENDPOINT_HOST_ISOLATION_EXCEPTIONS_LIST_ID } from '@kbn/securitysolution-list-constants';
import {
  getPackagePolicyCreateCallback,
  getPackagePolicyUpdateCallback,
  getPackagePolicyDeleteCallback,
  getPackagePolicyPostCreateCallback,
} from '../fleet_integration/fleet_integration';
import type { ManifestManager } from './services/artifacts';
import type { ConfigType } from '../config';
import type { IRequestContextFactory } from '../request_context_factory';
import type { LicenseService } from '../../common/license';
import type { EndpointMetadataService } from './services/metadata';
import {
  EndpointAppContentServicesNotSetUpError,
  EndpointAppContentServicesNotStartedError,
} from './errors';
import type {
  EndpointFleetServicesFactoryInterface,
  EndpointInternalFleetServicesInterface,
  EndpointScopedFleetServicesInterface,
} from './services/fleet/endpoint_fleet_services_factory';
import { registerListsPluginEndpointExtensionPoints } from '../lists_integration';
import type { EndpointAuthz } from '../../common/endpoint/types/authz';
import { calculateEndpointAuthz } from '../../common/endpoint/service/authz';
import type { FeatureUsageService } from './services/feature_usage/service';
import type { ExperimentalFeatures } from '../../common/experimental_features';
import { doesArtifactHaveData } from './services';

export interface EndpointAppContextServiceSetupContract {
  securitySolutionRequestContextFactory: IRequestContextFactory;
}

export type EndpointAppContextServiceStartContract = Partial<
  Pick<
    FleetStartContract,
    'agentService' | 'packageService' | 'packagePolicyService' | 'agentPolicyService'
  >
> & {
  fleetAuthzService?: FleetStartContract['authz'];
  logger: Logger;
  endpointMetadataService: EndpointMetadataService;
  endpointFleetServicesFactory: EndpointFleetServicesFactoryInterface;
  manifestManager?: ManifestManager;
  security: SecurityPluginStart;
  alerting: AlertsPluginStartContract;
  config: ConfigType;
  registerIngestCallback?: FleetStartContract['registerExternalCallback'];
  registerListsServerExtension?: ListsServerExtensionRegistrar;
  licenseService: LicenseService;
  exceptionListsClient: ExceptionListClient | undefined;
  cases: CasesPluginStartContract | undefined;
  featureUsageService: FeatureUsageService;
  experimentalFeatures: ExperimentalFeatures;
};

/**
 * A singleton that holds shared services that are initialized during the start up phase
 * of the plugin lifecycle. And stop during the stop phase, if needed.
 */
export class EndpointAppContextService {
  private setupDependencies: EndpointAppContextServiceSetupContract | null = null;
  private startDependencies: EndpointAppContextServiceStartContract | null = null;
  private fleetServicesFactory: EndpointFleetServicesFactoryInterface | null = null;
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
    this.fleetServicesFactory = dependencies.endpointFleetServicesFactory;

    if (
      dependencies.registerIngestCallback &&
      dependencies.manifestManager &&
      dependencies.packagePolicyService
    ) {
      const {
        registerIngestCallback,
        logger,
        manifestManager,
        alerting,
        licenseService,
        exceptionListsClient,
        featureUsageService,
        endpointMetadataService,
      } = dependencies;

      registerIngestCallback(
        'packagePolicyCreate',
        getPackagePolicyCreateCallback(
          logger,
          manifestManager,
          this.setupDependencies.securitySolutionRequestContextFactory,
          alerting,
          licenseService,
          exceptionListsClient
        )
      );

      registerIngestCallback(
        'packagePolicyPostCreate',
        getPackagePolicyPostCreateCallback(logger, exceptionListsClient)
      );

      registerIngestCallback(
        'packagePolicyUpdate',
        getPackagePolicyUpdateCallback(
          logger,
          licenseService,
          featureUsageService,
          endpointMetadataService
        )
      );

      registerIngestCallback(
        'packagePolicyPostDelete',
        getPackagePolicyDeleteCallback(exceptionListsClient)
      );
    }

    if (this.startDependencies.registerListsServerExtension) {
      const { registerListsServerExtension } = this.startDependencies;

      registerListsPluginEndpointExtensionPoints(registerListsServerExtension, this);
    }
  }

  public stop() {}

  private getFleetAuthzService(): FleetStartContract['authz'] {
    if (!this.startDependencies?.fleetAuthzService) {
      throw new EndpointAppContentServicesNotStartedError();
    }

    return this.startDependencies.fleetAuthzService;
  }

  public async getEndpointAuthz(request: KibanaRequest): Promise<EndpointAuthz> {
    const fleetAuthz = await this.getFleetAuthzService().fromRequest(request);
    const userRoles = this.security?.authc.getCurrentUser(request)?.roles ?? [];
    const { endpointRbacEnabled, endpointRbacV1Enabled } = this.experimentalFeatures;
    const isPlatinumPlus = this.getLicenseService().isPlatinumPlus();
    const listClient = this.getExceptionListsClient();

    const hasExceptionsListItems = !isPlatinumPlus
      ? await doesArtifactHaveData(listClient, ENDPOINT_HOST_ISOLATION_EXCEPTIONS_LIST_ID)
      : true;

    return calculateEndpointAuthz(
      this.getLicenseService(),
      fleetAuthz,
      userRoles,
      endpointRbacEnabled || endpointRbacV1Enabled,
      hasExceptionsListItems
    );
  }

  public getEndpointMetadataService(): EndpointMetadataService {
    if (this.startDependencies == null) {
      throw new EndpointAppContentServicesNotStartedError();
    }
    return this.startDependencies.endpointMetadataService;
  }

  public getScopedFleetServices(req: KibanaRequest): EndpointScopedFleetServicesInterface {
    if (this.fleetServicesFactory === null) {
      throw new EndpointAppContentServicesNotStartedError();
    }

    return this.fleetServicesFactory.asScoped(req);
  }

  public getInternalFleetServices(): EndpointInternalFleetServicesInterface {
    if (this.fleetServicesFactory === null) {
      throw new EndpointAppContentServicesNotStartedError();
    }

    return this.fleetServicesFactory.asInternalUser();
  }

  /** @deprecated use `getScopedFleetServices()` instead */
  public getAgentService(): AgentService | undefined {
    return this.startDependencies?.agentService;
  }

  /** @deprecated use `getScopedFleetServices()` instead */
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

  public getFeatureUsageService(): FeatureUsageService {
    if (this.startDependencies == null) {
      throw new EndpointAppContentServicesNotStartedError();
    }
    return this.startDependencies.featureUsageService;
  }

  public get experimentalFeatures(): ExperimentalFeatures {
    if (this.startDependencies == null) {
      throw new EndpointAppContentServicesNotStartedError();
    }

    return this.startDependencies.experimentalFeatures;
  }

  public getExceptionListsClient(): ExceptionListClient {
    if (!this.startDependencies?.exceptionListsClient) {
      throw new EndpointAppContentServicesNotStartedError();
    }

    return this.startDependencies.exceptionListsClient;
  }
}
