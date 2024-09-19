/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ElasticsearchClient,
  HttpServiceSetup,
  KibanaRequest,
  LoggerFactory,
  SavedObjectsServiceStart,
  SecurityServiceStart,
} from '@kbn/core/server';
import type { ExceptionListClient, ListsServerExtensionRegistrar } from '@kbn/lists-plugin/server';
import type { CasesClient, CasesServerStart } from '@kbn/cases-plugin/server';
import type {
  FleetFromHostFileClientInterface,
  FleetStartContract,
  MessageSigningServiceInterface,
} from '@kbn/fleet-plugin/server';
import type { PluginStartContract as AlertsPluginStartContract } from '@kbn/alerting-plugin/server';
import type { CloudSetup } from '@kbn/cloud-plugin/server';
import type { FleetActionsClientInterface } from '@kbn/fleet-plugin/server/services/actions/types';
import type { PluginStartContract as ActionsPluginStartContract } from '@kbn/actions-plugin/server';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import { SavedObjectsClientFactory } from './services/saved_objects';
import type { ResponseActionsClient } from './services';
import { getResponseActionsClient, NormalizedExternalConnectorClient } from './services';
import {
  getAgentPolicyCreateCallback,
  getAgentPolicyUpdateCallback,
  getPackagePolicyCreateCallback,
  getPackagePolicyDeleteCallback,
  getPackagePolicyPostCreateCallback,
  getPackagePolicyUpdateCallback,
} from '../fleet_integration/fleet_integration';
import type { ManifestManager } from './services/artifacts';
import type { ConfigType } from '../config';
import type { IRequestContextFactory } from '../request_context_factory';
import type { LicenseService } from '../../common/license';
import { EndpointMetadataService } from './services/metadata';
import {
  EndpointAppContentServicesNotSetUpError,
  EndpointAppContentServicesNotStartedError,
} from './errors';
import type {
  EndpointFleetServicesFactoryInterface,
  EndpointInternalFleetServicesInterface,
} from './services/fleet/endpoint_fleet_services_factory';
import { EndpointFleetServicesFactory } from './services/fleet/endpoint_fleet_services_factory';
import { registerListsPluginEndpointExtensionPoints } from '../lists_integration';
import type { EndpointAuthz } from '../../common/endpoint/types/authz';
import { calculateEndpointAuthz } from '../../common/endpoint/service/authz';
import type { FeatureUsageService } from './services/feature_usage/service';
import type { ExperimentalFeatures } from '../../common/experimental_features';
import type { ProductFeaturesService } from '../lib/product_features_service/product_features_service';
import type { ResponseActionAgentType } from '../../common/endpoint/service/response_actions/constants';

export interface EndpointAppContextServiceSetupContract {
  securitySolutionRequestContextFactory: IRequestContextFactory;
  cloud: CloudSetup;
  loggerFactory: LoggerFactory;
  httpServiceSetup: HttpServiceSetup;
}

export interface EndpointAppContextServiceStartContract {
  fleetStartServices: FleetStartContract;
  manifestManager: ManifestManager;
  security: SecurityServiceStart;
  alerting: AlertsPluginStartContract;
  config: ConfigType;
  registerListsServerExtension?: ListsServerExtensionRegistrar;
  licenseService: LicenseService;
  exceptionListsClient: ExceptionListClient | undefined;
  cases: CasesServerStart | undefined;
  featureUsageService: FeatureUsageService;
  experimentalFeatures: ExperimentalFeatures;
  messageSigningService: MessageSigningServiceInterface | undefined;
  /** An internal ES client */
  esClient: ElasticsearchClient;
  productFeaturesService: ProductFeaturesService;
  savedObjectsServiceStart: SavedObjectsServiceStart;
  connectorActions: ActionsPluginStartContract;
}

/**
 * A singleton that holds shared services that are initialized during the start up phase
 * of the plugin lifecycle. And stop during the stop phase, if needed.
 */
export class EndpointAppContextService {
  private setupDependencies: EndpointAppContextServiceSetupContract | null = null;
  private startDependencies: EndpointAppContextServiceStartContract | null = null;
  private fleetServicesFactory: EndpointFleetServicesFactoryInterface | null = null;
  private savedObjectsFactoryService: SavedObjectsClientFactory | null = null;

  public security: SecurityServiceStart | undefined;

  public setup(dependencies: EndpointAppContextServiceSetupContract) {
    this.setupDependencies = dependencies;
  }

  public start(dependencies: EndpointAppContextServiceStartContract) {
    if (!this.setupDependencies) {
      throw new EndpointAppContentServicesNotSetUpError();
    }

    const savedObjectsFactory = new SavedObjectsClientFactory(
      dependencies.savedObjectsServiceStart,
      this.setupDependencies.httpServiceSetup
    );

    this.startDependencies = dependencies;
    this.security = dependencies.security;
    this.savedObjectsFactoryService = savedObjectsFactory;
    this.fleetServicesFactory = new EndpointFleetServicesFactory(
      dependencies.fleetStartServices,
      savedObjectsFactory
    );

    this.registerFleetExtensions();
    this.registerListsExtensions();
  }

  public stop() {
    this.startDependencies = null;
    this.savedObjectsFactoryService = null;
  }

  private registerListsExtensions() {
    if (this.startDependencies?.registerListsServerExtension) {
      registerListsPluginEndpointExtensionPoints(
        this.startDependencies?.registerListsServerExtension,
        this
      );
    }
  }

  private registerFleetExtensions() {
    if (!this.setupDependencies) {
      throw new EndpointAppContentServicesNotSetUpError();
    }
    if (!this.startDependencies) {
      throw new EndpointAppContentServicesNotStartedError();
    }

    const {
      fleetStartServices: { registerExternalCallback: registerFleetCallback },
      manifestManager,
      alerting,
      licenseService,
      exceptionListsClient,
      featureUsageService,
      esClient,
      productFeaturesService,
    } = this.startDependencies;
    const endpointMetadataService = this.getEndpointMetadataService();
    const soClient = this.savedObjects.createInternalScopedSoClient(undefined, false);
    const logger = this.createLogger('endpointFleetExtension');

    registerFleetCallback(
      'agentPolicyCreate',
      getAgentPolicyCreateCallback(logger, productFeaturesService)
    );
    registerFleetCallback(
      'agentPolicyUpdate',
      getAgentPolicyUpdateCallback(logger, productFeaturesService)
    );

    registerFleetCallback(
      'packagePolicyCreate',
      getPackagePolicyCreateCallback(
        logger,
        manifestManager,
        this.setupDependencies.securitySolutionRequestContextFactory,
        alerting,
        licenseService,
        exceptionListsClient,
        this.setupDependencies.cloud,
        productFeaturesService
      )
    );

    registerFleetCallback(
      'packagePolicyPostCreate',
      getPackagePolicyPostCreateCallback(logger, exceptionListsClient)
    );

    registerFleetCallback(
      'packagePolicyUpdate',
      getPackagePolicyUpdateCallback(
        logger,
        licenseService,
        featureUsageService,
        endpointMetadataService,
        this.setupDependencies.cloud,
        esClient,
        productFeaturesService
      )
    );

    registerFleetCallback(
      'packagePolicyPostDelete',
      getPackagePolicyDeleteCallback(exceptionListsClient, soClient)
    );
  }

  /**
   * Property providing access to saved objects client factory
   */
  public get savedObjects(): SavedObjectsClientFactory {
    if (!this.savedObjectsFactoryService) {
      throw new EndpointAppContentServicesNotStartedError();
    }

    return this.savedObjectsFactoryService;
  }

  private getFleetAuthzService(): FleetStartContract['authz'] {
    if (!this.startDependencies?.fleetStartServices) {
      throw new EndpointAppContentServicesNotStartedError();
    }

    return this.startDependencies.fleetStartServices.authz;
  }

  public createLogger(...contextParts: string[]) {
    if (!this.setupDependencies?.loggerFactory) {
      throw new EndpointAppContentServicesNotSetUpError();
    }

    return this.setupDependencies.loggerFactory.get(...contextParts);
  }

  public async getEndpointAuthz(request: KibanaRequest): Promise<EndpointAuthz> {
    if (!this.startDependencies?.productFeaturesService) {
      throw new EndpointAppContentServicesNotStartedError();
    }
    const fleetAuthz = await this.getFleetAuthzService().fromRequest(request);
    const userRoles = this.security?.authc.getCurrentUser(request)?.roles ?? [];
    return calculateEndpointAuthz(
      this.getLicenseService(),
      fleetAuthz,
      userRoles,
      this.startDependencies.productFeaturesService
    );
  }

  public getEndpointMetadataService(spaceId: string = DEFAULT_SPACE_ID): EndpointMetadataService {
    if (this.startDependencies == null) {
      throw new EndpointAppContentServicesNotStartedError();
    }

    return new EndpointMetadataService(
      this.startDependencies.esClient,
      this.savedObjects.createInternalScopedSoClient(spaceId, false),
      this.getInternalFleetServices(),
      this.createLogger('endpointMetadata')
    );
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

  public getInternalResponseActionsClient({
    agentType = 'endpoint',
    username = 'elastic',
    taskId,
    taskType,
  }: {
    agentType?: ResponseActionAgentType;
    username?: string;
    /** Used with background task and needed for `UnsecuredActionsClient`  */
    taskId?: string;
    /** Used with background task and needed for `UnsecuredActionsClient`  */
    taskType?: string;
  }): ResponseActionsClient {
    if (!this.startDependencies?.esClient) {
      throw new EndpointAppContentServicesNotStartedError();
    }

    return getResponseActionsClient(agentType, {
      endpointService: this,
      esClient: this.startDependencies.esClient,
      username,
      isAutomated: true,
      connectorActions: new NormalizedExternalConnectorClient(
        this.startDependencies.connectorActions.getUnsecuredActionsClient(),
        this.createLogger('responseActions'),
        {
          relatedSavedObjects:
            taskId && taskType
              ? [
                  {
                    id: taskId,
                    type: taskType,
                  },
                ]
              : undefined,
        }
      ),
    });
  }

  public async getFleetToHostFilesClient() {
    if (!this.startDependencies?.fleetStartServices) {
      throw new EndpointAppContentServicesNotStartedError();
    }

    return this.startDependencies.fleetStartServices.createFilesClient.toHost(
      'endpoint',
      this.startDependencies.config.maxUploadResponseActionFileBytes
    );
  }

  public async getFleetFromHostFilesClient(): Promise<FleetFromHostFileClientInterface> {
    if (!this.startDependencies?.fleetStartServices) {
      throw new EndpointAppContentServicesNotStartedError();
    }

    return this.startDependencies.fleetStartServices.createFilesClient.fromHost('endpoint');
  }

  public async getFleetActionsClient(): Promise<FleetActionsClientInterface> {
    if (!this.startDependencies?.fleetStartServices) {
      throw new EndpointAppContentServicesNotStartedError();
    }

    return this.startDependencies.fleetStartServices.createFleetActionsClient('endpoint');
  }
}
