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
import type { KnowledgeBaseRegistryConfig } from './config';
import type {
  KnowledgeBaseRegistrySetupContract,
  KnowledgeBaseRegistryStartContract,
  KnowledgeBaseRegistrySetupDependencies,
  KnowledgeBaseRegistryStartDependencies,
} from './types';
import { knowledgeBaseProductDocInstallSavedObjectType } from './saved_objects';
import { PackageInstaller } from './services/package_installer';
import { InferenceEndpointManager } from './services/inference_endpoint';
import { ProductDocInstallClient } from './dao/doc_install_status';

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

  constructor(private readonly context: PluginInitializerContext<KnowledgeBaseRegistryConfig>) {
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
      core.savedObjects.createInternalRepository([productDocInstallStatusSavedObjectTypeName])
    );
    const productDocClient = new ProductDocInstallClient({ soClient });

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

    delay(10)
      .then(async () => {
        console.log('*** test installating packages');

        return packageInstaller.installAll({});
      })
      .catch((e) => {
        console.log('*** ERROR', e);
      });

    return {};
  }
}

const delay = (seconds: number) => new Promise((resolve) => setTimeout(resolve, seconds * 1000));
