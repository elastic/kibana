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
import type {
  ProductDocBaseSetupContract,
  ProductDocBaseStartContract,
  ProductDocBaseSetupDependencies,
  ProductDocBaseStartDependencies,
} from './types';
import { knowledgeBaseProductDocInstallSavedObjectType } from './saved_objects';
import { PackageInstaller } from './services/package_installer';
import { InferenceEndpointManager } from './services/inference_endpoint';
import { ProductDocInstallClient } from './services/doc_install_status';
import { SearchService } from './services/search';
import { registerRoutes } from './routes';

export class KnowledgeBaseRegistryPlugin
  implements
    Plugin<
      ProductDocBaseSetupContract,
      ProductDocBaseStartContract,
      ProductDocBaseSetupDependencies,
      ProductDocBaseStartDependencies
    >
{
  logger: Logger;
  private installClient?: ProductDocInstallClient;
  private packageInstaller?: PackageInstaller;

  constructor(private readonly context: PluginInitializerContext<ProductDocBaseConfig>) {
    this.logger = context.logger.get();
  }
  setup(
    coreSetup: CoreSetup<ProductDocBaseStartDependencies, ProductDocBaseStartContract>,
    pluginsSetup: ProductDocBaseSetupDependencies
  ): ProductDocBaseSetupContract {
    coreSetup.savedObjects.registerType(knowledgeBaseProductDocInstallSavedObjectType);

    const router = coreSetup.http.createRouter();
    registerRoutes({
      router,
      getInstallClient: () => {
        if (!this.installClient) {
          throw new Error('getInstallClient called before #start');
        }
        return this.installClient;
      },
      getInstaller: () => {
        if (!this.packageInstaller) {
          throw new Error('getInstaller called before #start');
        }
        return this.packageInstaller;
      },
    });

    return {};
  }

  start(
    core: CoreStart,
    pluginsStart: ProductDocBaseStartDependencies
  ): ProductDocBaseStartContract {
    const soClient = new SavedObjectsClient(
      core.savedObjects.createInternalRepository([productDocInstallStatusSavedObjectTypeName])
    );
    const productDocClient = new ProductDocInstallClient({ soClient });
    this.installClient = productDocClient;

    const endpointManager = new InferenceEndpointManager({
      esClient: core.elasticsearch.client.asInternalUser,
      logger: this.logger.get('endpoint-manager'),
    });

    this.packageInstaller = new PackageInstaller({
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

    // TODO: see if we should be using taskManager for that.
    this.packageInstaller.ensureUpToDate({}).catch((err) => {
      this.logger.error(`Error checking if product documentation is up to date: ${err.message}`);
    });

    // TODO: remove
    delay(10)
      .then(async () => {
        // this.logger.info('*** test installing packages');
        // await this.packageInstaller.installAll({});
        // const results = await searchService.search({
        //  query: 'How to create a space in Kibana?',
        //  products: ['kibana'],
        // );
        // console.log(JSON.stringify(results.results[0]));
      })
      .catch((e) => {
        this.logger.error('*** ERROR', e);
      });
    return {
      search: searchService.search.bind(searchService),
    };
  }
}

const delay = (seconds: number) => new Promise((resolve) => setTimeout(resolve, seconds * 1000));
