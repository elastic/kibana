/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializer, PluginInitializerContext } from '@kbn/core/public';
import { KnowledgeBaseRegistryPlugin } from './plugin';
import type {
  KnowledgeBaseRegistrySetupContract,
  KnowledgeBaseRegistryStartContract,
  KnowledgeBaseRegistrySetupDependencies,
  KnowledgeBaseRegistryStartDependencies,
  PublicPluginConfig,
} from './types';

export type { KnowledgeBaseRegistrySetupContract, KnowledgeBaseRegistryStartContract };

export const plugin: PluginInitializer<
  KnowledgeBaseRegistrySetupContract,
  KnowledgeBaseRegistryStartContract,
  KnowledgeBaseRegistrySetupDependencies,
  KnowledgeBaseRegistryStartDependencies
> = (pluginInitializerContext: PluginInitializerContext<PublicPluginConfig>) =>
  new KnowledgeBaseRegistryPlugin(pluginInitializerContext);
