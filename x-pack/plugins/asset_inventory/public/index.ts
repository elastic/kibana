/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializer, PluginInitializerContext } from '@kbn/core/public';

import {
  Plugin,
  AssetInventoryPublicPluginsStart,
  AssetInventoryPublicPluginsSetup,
  AssetInventoryPublicStart,
  AssetInventoryPublicSetup,
} from './plugin';

export type {
  AssetInventoryPublicSetup,
  AssetInventoryPublicStart,
  AssetInventoryPublicPluginsSetup,
  AssetInventoryPublicPluginsStart,
};

export const plugin: PluginInitializer<
  AssetInventoryPublicSetup,
  AssetInventoryPublicStart,
  AssetInventoryPublicPluginsSetup,
  AssetInventoryPublicPluginsStart
> = (initializerContext: PluginInitializerContext) => {
  return new Plugin(initializerContext);
};
