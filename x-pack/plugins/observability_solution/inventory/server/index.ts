/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { PluginInitializer, PluginInitializerContext } from '@kbn/core/server';
import { InventoryPlugin } from './plugin';
import type {
  InventoryServerSetup,
  InventoryServerStart,
  InventorySetupDependencies,
  InventoryStartDependencies,
} from './types';

export type { InventoryServerRouteRepository } from './routes/get_global_inventory_route_repository';

export type { InventoryServerSetup, InventoryServerStart };

export const plugin: PluginInitializer<
  InventoryServerSetup,
  InventoryServerStart,
  InventorySetupDependencies,
  InventoryStartDependencies
> = async (pluginInitializerContext: PluginInitializerContext) =>
  new InventoryPlugin(pluginInitializerContext);
