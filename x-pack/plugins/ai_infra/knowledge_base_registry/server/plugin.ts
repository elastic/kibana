/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { KnowledgeBaseRegistryConfig } from './config';
import type {
  KnowledgeBaseRegistrySetupContract,
  KnowledgeBaseRegistryStartContract,
  KnowledgeBaseRegistrySetupDependencies,
  KnowledgeBaseRegistryStartDependencies,
} from './types';
import { knowledgeBaseEntrySavedObjectType } from './saved_objects';

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
    coreSetup.savedObjects.registerType(knowledgeBaseEntrySavedObjectType);
    return {};
  }

  start(
    core: CoreStart,
    pluginsStart: KnowledgeBaseRegistryStartDependencies
  ): KnowledgeBaseRegistryStartContract {
    return {};
  }
}
