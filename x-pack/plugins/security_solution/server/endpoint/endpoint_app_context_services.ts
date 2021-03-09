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
import { SecurityPluginSetup } from '../../../security/server';
import {
  AgentService,
  FleetStartContract,
  PackageService,
  AgentPolicyServiceInterface,
  PackagePolicyServiceInterface,
} from '../../../fleet/server';
import { PluginStartContract as AlertsPluginStartContract } from '../../../alerting/server';
import {
  getPackagePolicyCreateCallback,
  getPackagePolicyUpdateCallback,
} from './ingest_integration';
import { ManifestManager } from './services/artifacts';
import { MetadataQueryStrategy } from './types';
import { MetadataQueryStrategyVersions } from '../../common/endpoint/types';
import {
  metadataQueryStrategyV1,
  metadataQueryStrategyV2,
} from './routes/metadata/support/query_strategies';
import { ElasticsearchAssetType } from '../../../fleet/common/types/models';
import { metadataTransformPrefix } from '../../common/endpoint/constants';
import { AppClientFactory } from '../client';
import { ConfigType } from '../config';
import { LicenseService } from '../../common/license/license';

export interface MetadataService {
  queryStrategy(
    savedObjectsClient: SavedObjectsClientContract,
    version?: MetadataQueryStrategyVersions
  ): Promise<MetadataQueryStrategy>;
}

export const createMetadataService = (packageService: PackageService): MetadataService => {
  return {
    async queryStrategy(
      savedObjectsClient: SavedObjectsClientContract,
      version?: MetadataQueryStrategyVersions
    ): Promise<MetadataQueryStrategy> {
      if (version === MetadataQueryStrategyVersions.VERSION_1) {
        return metadataQueryStrategyV1();
      }
      if (!packageService) {
        throw new Error('package service is uninitialized');
      }

      if (version === MetadataQueryStrategyVersions.VERSION_2 || !version) {
        const assets = await packageService.getInstalledEsAssetReferences(
          savedObjectsClient,
          'endpoint'
        );
        const expectedTransformAssets = assets.filter(
          (ref) =>
            ref.type === ElasticsearchAssetType.transform &&
            ref.id.startsWith(metadataTransformPrefix)
        );
        if (expectedTransformAssets && expectedTransformAssets.length === 1) {
          return metadataQueryStrategyV2();
        }
        return metadataQueryStrategyV1();
      }
      return metadataQueryStrategyV1();
    },
  };
};

export type EndpointAppContextServiceStartContract = Partial<
  Pick<
    FleetStartContract,
    'agentService' | 'packageService' | 'packagePolicyService' | 'agentPolicyService'
  >
> & {
  logger: Logger;
  manifestManager?: ManifestManager;
  appClientFactory: AppClientFactory;
  security: SecurityPluginSetup;
  alerting: AlertsPluginStartContract;
  config: ConfigType;
  registerIngestCallback?: FleetStartContract['registerExternalCallback'];
  savedObjectsStart: SavedObjectsServiceStart;
  licenseService: LicenseService;
  exceptionListsClient: ExceptionListClient | undefined;
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
  private metadataService: MetadataService | undefined;

  public start(dependencies: EndpointAppContextServiceStartContract) {
    this.agentService = dependencies.agentService;
    this.packagePolicyService = dependencies.packagePolicyService;
    this.agentPolicyService = dependencies.agentPolicyService;
    this.manifestManager = dependencies.manifestManager;
    this.savedObjectsStart = dependencies.savedObjectsStart;
    this.metadataService = createMetadataService(dependencies.packageService!);

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

  public getAgentService(): AgentService | undefined {
    return this.agentService;
  }

  public getPackagePolicyService(): PackagePolicyServiceInterface | undefined {
    return this.packagePolicyService;
  }

  public getAgentPolicyService(): AgentPolicyServiceInterface | undefined {
    return this.agentPolicyService;
  }

  public getMetadataService(): MetadataService | undefined {
    return this.metadataService;
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
}
