/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';
import type { Logger } from '@kbn/logging';
import { getDataPath } from '@kbn/utils';
import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import { SavedObjectsClient } from '@kbn/core/server';
import { productDocInstallStatusSavedObjectTypeName } from '../common/consts';
import type { ProductDocBaseConfig } from './config';
import {
  ProductDocBaseSetupContract,
  ProductDocBaseStartContract,
  ProductDocBaseSetupDependencies,
  ProductDocBaseStartDependencies,
  InternalRouteServices,
} from './types';
import { productDocInstallStatusSavedObjectType } from './saved_objects';
import { PackageInstaller } from './services/package_installer';
import { InferenceEndpointManager } from './services/inference_endpoint';
import { ProductDocInstallClient } from './services/doc_install_status';
import { SearchService } from './services/search';
import { registerRoutes } from './routes';

export class ProductDocBasePlugin
  implements
    Plugin<
      ProductDocBaseSetupContract,
      ProductDocBaseStartContract,
      ProductDocBaseSetupDependencies,
      ProductDocBaseStartDependencies
    >
{
  private logger: Logger;
  private routeServices?: InternalRouteServices;

  constructor(private readonly context: PluginInitializerContext<ProductDocBaseConfig>) {
    this.logger = context.logger.get();
  }
  setup(
    coreSetup: CoreSetup<ProductDocBaseStartDependencies, ProductDocBaseStartContract>,
    pluginsSetup: ProductDocBaseSetupDependencies
  ): ProductDocBaseSetupContract {
    coreSetup.savedObjects.registerType(productDocInstallStatusSavedObjectType);

    const router = coreSetup.http.createRouter();
    registerRoutes({
      router,
      getServices: () => {
        if (!this.routeServices) {
          throw new Error('getServices called before #start');
        }
        return this.routeServices;
      },
    });

    return {};
  }

  start(
    core: CoreStart,
    { licensing }: ProductDocBaseStartDependencies
  ): ProductDocBaseStartContract {
    const soClient = new SavedObjectsClient(
      core.savedObjects.createInternalRepository([productDocInstallStatusSavedObjectTypeName])
    );
    const productDocClient = new ProductDocInstallClient({ soClient });
    const installClient = productDocClient;

    const endpointManager = new InferenceEndpointManager({
      esClient: core.elasticsearch.client.asInternalUser,
      logger: this.logger.get('endpoint-manager'),
    });

    const packageInstaller = new PackageInstaller({
      esClient: core.elasticsearch.client.asInternalUser,
      productDocClient,
      endpointManager,
      kibanaVersion: this.context.env.packageInfo.version,
      artifactsFolder: Path.join(getDataPath(), 'ai-kb-artifacts'),
      artifactRepositoryUrl: this.context.config.get().artifactRepositoryUrl,
      logger: this.logger.get('package-installer'),
    });

    const searchService = new SearchService({
      esClient: core.elasticsearch.client.asInternalUser,
      logger: this.logger.get('search-service'),
    });

    // should we use taskManager for this?
    packageInstaller.ensureUpToDate({}).catch((err) => {
      this.logger.error(`Error checking if product documentation is up to date: ${err.message}`);
    });

    this.routeServices = {
      packageInstaller,
      installClient,
      licensing,
    };

    return {
      isInstalled: async () => {
        // can probably be improved. But is a boolean good enough then
        const installStatus = await productDocClient.getInstallationStatus();
        const installed = Object.values(installStatus).some(
          (status) => status.status === 'installed'
        );
        return installed;
      },
      search: searchService.search.bind(searchService),
    };
  }
}
