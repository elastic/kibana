/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { Logger } from '@kbn/logging';
import type {
  PublicPluginConfig,
  KnowledgeBaseRegistrySetupContract,
  KnowledgeBaseRegistryStartContract,
  KnowledgeBaseRegistrySetupDependencies,
  KnowledgeBaseRegistryStartDependencies,
} from './types';

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

  constructor(context: PluginInitializerContext<PublicPluginConfig>) {
    this.logger = context.logger.get();
  }
  setup(
    coreSetup: CoreSetup<
      KnowledgeBaseRegistryStartDependencies,
      KnowledgeBaseRegistryStartContract
    >,
    pluginsSetup: KnowledgeBaseRegistrySetupDependencies
  ): KnowledgeBaseRegistrySetupContract {
    return {};
  }

  start(
    coreStart: CoreStart,
    pluginsStart: KnowledgeBaseRegistryStartDependencies
  ): KnowledgeBaseRegistryStartContract {
    return {};
  }
}
