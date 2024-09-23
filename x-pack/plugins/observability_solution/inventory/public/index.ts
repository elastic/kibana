/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { PluginInitializer, PluginInitializerContext } from '@kbn/core/public';

import { InventoryPlugin } from './plugin';
import type {
  InventoryPublicSetup,
  InventoryPublicStart,
  InventorySetupDependencies,
  InventoryStartDependencies,
  ConfigSchema,
} from './types';

export type { InventoryPublicSetup, InventoryPublicStart };

export const plugin: PluginInitializer<
  InventoryPublicSetup,
  InventoryPublicStart,
  InventorySetupDependencies,
  InventoryStartDependencies
> = (pluginInitializerContext: PluginInitializerContext<ConfigSchema>) =>
  new InventoryPlugin(pluginInitializerContext);
