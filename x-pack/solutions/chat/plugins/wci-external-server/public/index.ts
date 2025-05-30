/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializer, PluginInitializerContext } from '@kbn/core/public';
import { WCIExternalServerPlugin } from './plugin';
import {
  WCIExternalServerPluginSetup,
  WCIExternalServerPluginStart,
  WCIExternalServerPluginStartDependencies,
} from './types';

export const plugin: PluginInitializer<
  WCIExternalServerPluginSetup,
  WCIExternalServerPluginStart,
  {},
  WCIExternalServerPluginStartDependencies
> = (context: PluginInitializerContext) => {
  return new WCIExternalServerPlugin(context);
};

export type { WCIExternalServerPluginSetup, WCIExternalServerPluginStart } from './types';
