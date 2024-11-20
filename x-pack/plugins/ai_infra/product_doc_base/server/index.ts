/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializer, PluginInitializerContext } from '@kbn/core/server';
import type { ProductDocBaseConfig } from './config';
import type {
  ProductDocBaseSetupContract,
  ProductDocBaseStartContract,
  ProductDocBaseSetupDependencies,
  ProductDocBaseStartDependencies,
} from './types';
import { ProductDocBasePlugin } from './plugin';

export { config } from './config';

export type { ProductDocBaseSetupContract, ProductDocBaseStartContract };
export type { SearchApi as ProductDocSearchAPI } from './services/search/types';

export const plugin: PluginInitializer<
  ProductDocBaseSetupContract,
  ProductDocBaseStartContract,
  ProductDocBaseSetupDependencies,
  ProductDocBaseStartDependencies
> = async (pluginInitializerContext: PluginInitializerContext<ProductDocBaseConfig>) =>
  new ProductDocBasePlugin(pluginInitializerContext);
