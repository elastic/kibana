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
import { knowledgeBaseProductDocInstallTypeName } from '../common/consts';
import type { KnowledgeBaseRegistryConfig } from './config';
import type {
  KnowledgeBaseRegistrySetupContract,
  KnowledgeBaseRegistryStartContract,
  KnowledgeBaseRegistrySetupDependencies,
  KnowledgeBaseRegistryStartDependencies,
} from './types';
import { knowledgeBaseProductDocInstallSavedObjectType } from './saved_objects';
import { PackageInstaller } from './services/package_installer';
import { ProductDocInstallClient } from './dao/product_doc_install';

export class KnowledgeBaseRegistryPlugin
  implements
    Plugin<
      KnowledgeBaseRegistrySetupContract,
      KnowledgeBaseRegistryStartContract,
      KnowledgeBaseRegistrySetupDependencies,
      KnowledgeBaseRegistryStartDependencies
    >
{
  logger: Logger;

  constructor(context: PluginInitializerContext<KnowledgeBaseRegistryConfig>) {
    this.logger = context.logger.get();
  }
  setup(
    coreSetup: CoreSetup<
      KnowledgeBaseRegistryStartDependencies,
      KnowledgeBaseRegistryStartContract
    >,
    pluginsSetup: KnowledgeBaseRegistrySetupDependencies
  ): KnowledgeBaseRegistrySetupContract {
    coreSetup.savedObjects.registerType(knowledgeBaseProductDocInstallSavedObjectType);

    return {};
  }

  start(
    core: CoreStart,
    pluginsStart: KnowledgeBaseRegistryStartDependencies
  ): KnowledgeBaseRegistryStartContract {
    const soClient = new SavedObjectsClient(
      core.savedObjects.createInternalRepository([knowledgeBaseProductDocInstallTypeName])
    );
    const productDocClient = new ProductDocInstallClient({ soClient });

    const packageInstaller = new PackageInstaller({
      esClient: core.elasticsearch.client.asInternalUser,
      productDocClient,
      artifactsFolder: Path.join(getDataPath(), 'ai-kb-artifacts'),
      logger: this.logger.get('package-installer'),
    });

    delay(10)
      .then(() => {
        console.log('*** test installating package');
        return packageInstaller.installPackage({
          productName: 'Kibana',
          productVersion: '8.15',
        });
      })
      .catch((e) => {
        console.log('*** ERROR', e);
      });

    return {};
  }
}

const delay = (seconds: number) => new Promise((resolve) => setTimeout(resolve, seconds * 1000));
