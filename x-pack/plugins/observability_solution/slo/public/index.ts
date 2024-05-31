/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { PluginInitializer, PluginInitializerContext } from '@kbn/core/public';
import { SloPlugin } from './plugin';
import type {
  SloPublicSetup,
  SloPublicStart,
  SloPublicPluginsSetup,
  SloPublicPluginsStart,
} from './types';

export const plugin: PluginInitializer<
  SloPublicSetup,
  SloPublicStart,
  SloPublicPluginsSetup,
  SloPublicPluginsStart
> = (initializerContext: PluginInitializerContext) => {
  return new SloPlugin(initializerContext);
};
export type { SloPublicPluginsSetup, SloPublicPluginsStart, SloPublicStart } from './types';
