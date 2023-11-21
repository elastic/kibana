/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ElasticsearchClient,
  KibanaRequest,
  Logger,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import type { ExceptionListClient, ListsServerExtensionRegistrar } from '@kbn/lists-plugin/server';
import type { CasesClient, CasesStart } from '@kbn/cases-plugin/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import type {
  FleetFromHostFileClientInterface,
  FleetStartContract,
  MessageSigningServiceInterface,
} from '@kbn/fleet-plugin/server';
import type { PluginStartContract as AlertsPluginStartContract } from '@kbn/alerting-plugin/server';
import type { CloudSetup } from '@kbn/cloud-plugin/server';
import type { FleetActionsClientInterface } from '@kbn/fleet-plugin/server/services/actions/types';
import {
  getPackagePolicyCreateCallback,
  getPackagePolicyDeleteCallback,
  getPackagePolicyPostCreateCallback,
  getPackagePolicyUpdateCallback,
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
} from './services/fleet/endpoint_fleet_services_factory';
import { registerListsPluginEndpointExtensionPoints } from '../lists_integration';
import type { EndpointAuthz } from '../../common/endpoint/types/authz';
import { calculateEndpointAuthz } from '../../common/endpoint/service/authz';
import type { FeatureUsageService } from './services/feature_usage/service';
import type { ExperimentalFeatures } from '../../common/experimental_features';
import type { ActionCreateService } from './services/actions/create/types';
import type { AppFeaturesService } from '../lib/app_features_service/app_features_service';

export interface EndpointAppContextServiceSetupContract {
  securitySolutionRequestContextFactory: IRequestContextFactory;
  cloud: CloudSetup;
}

export interface EndpointAppContextServiceStartContract {
  fleetAuthzService?: FleetStartContract['authz'];
  createFleetFilesClient: FleetStartContract['createFilesClient'];
  createFleetActionsClient: FleetStartContract['createFleetActionsClient'];
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
  cases: CasesStart | undefined;
  featureUsageService: FeatureUsageService;
  experimentalFeatures: ExperimentalFeatures;
  messageSigningService: MessageSigningServiceInterface | undefined;
  actionCreateService: ActionCreateService | undefined;
  esClient: ElasticsearchClient;
  appFeaturesService: AppFeaturesService;
  savedObjectsClient: SavedObjectsClientContract;
}

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

    if (dependencies.registerIngestCallback && dependencies.manifestManager) {
      const {
        registerIngestCallback,
        logger,
        manifestManager,
        alerting,
        licenseService,
        exceptionListsClient,
        featureUsageService,
        endpointMetadataService,
        esClient,
        appFeaturesService,
        savedObjectsClient,
      } = dependencies;

      registerIngestCallback(
        'packagePolicyCreate',
        getPackagePolicyCreateCallback(
          logger,
          manifestManager,
          this.setupDependencies.securitySolutionRequestContextFactory,
          alerting,
          licenseService,
          exceptionListsClient,
          this.setupDependencies.cloud,
          appFeaturesService
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
          endpointMetadataService,
          this.setupDependencies.cloud,
          esClient,
          appFeaturesService
        )
      );

      registerIngestCallback(
        'packagePolicyPostDelete',
        getPackagePolicyDeleteCallback(exceptionListsClient, savedObjectsClient)
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
    return calculateEndpointAuthz(this.getLicenseService(), fleetAuthz, userRoles);
  }

  public getEndpointMetadataService(): EndpointMetadataService {
    if (this.startDependencies == null) {
      throw new EndpointAppContentServicesNotStartedError();
    }
    return this.startDependencies.endpointMetadataService;
  }

  public getInternalFleetServices(): EndpointInternalFleetServicesInterface {
    if (this.fleetServicesFactory === null) {
      throw new EndpointAppContentServicesNotStartedError();
    }

    return this.fleetServicesFactory.asInternalUser();
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

  public getMessageSigningService(): MessageSigningServiceInterface {
    if (!this.startDependencies?.messageSigningService) {
      throw new EndpointAppContentServicesNotStartedError();
    }

    return this.startDependencies.messageSigningService;
  }

  public getActionCreateService(): ActionCreateService {
    if (!this.startDependencies?.actionCreateService) {
      throw new EndpointAppContentServicesNotStartedError();
    }

    return this.startDependencies.actionCreateService;
  }

  public async getFleetToHostFilesClient() {
    if (!this.startDependencies?.createFleetFilesClient) {
      throw new EndpointAppContentServicesNotStartedError();
    }

    return this.startDependencies.createFleetFilesClient.toHost(
      'endpoint',
      this.startDependencies.config.maxUploadResponseActionFileBytes
    );
  }

  public async getFleetFromHostFilesClient(): Promise<FleetFromHostFileClientInterface> {
    if (!this.startDependencies?.createFleetFilesClient) {
      throw new EndpointAppContentServicesNotStartedError();
    }

    return this.startDependencies.createFleetFilesClient.fromHost('endpoint');
  }

  public async getFleetActionsClient(): Promise<FleetActionsClientInterface> {
    if (!this.startDependencies?.createFleetActionsClient) {
      throw new EndpointAppContentServicesNotStartedError();
    }

    return this.startDependencies.createFleetActionsClient('endpoint');
  }
}
