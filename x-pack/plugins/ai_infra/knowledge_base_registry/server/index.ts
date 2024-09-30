/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializer, PluginInitializerContext } from '@kbn/core/server';
import type { KnowledgeBaseRegistryConfig } from './config';
import type {
  KnowledgeBaseRegistrySetupContract,
  KnowledgeBaseRegistryStartContract,
  KnowledgeBaseRegistrySetupDependencies,
  KnowledgeBaseRegistryStartDependencies,
} from './types';
import { KnowledgeBaseRegistryPlugin } from './plugin';

export type { KnowledgeBaseRegistrySetupContract, KnowledgeBaseRegistryStartContract };

export const plugin: PluginInitializer<
  KnowledgeBaseRegistrySetupContract,
  KnowledgeBaseRegistryStartContract,
  KnowledgeBaseRegistrySetupDependencies,
  KnowledgeBaseRegistryStartDependencies
> = async (pluginInitializerContext: PluginInitializerContext<KnowledgeBaseRegistryConfig>) =>
  new KnowledgeBaseRegistryPlugin(pluginInitializerContext);
