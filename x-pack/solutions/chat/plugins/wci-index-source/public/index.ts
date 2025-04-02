/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializer, PluginInitializerContext } from '@kbn/core/public';
import { WCIIndexSourcePlugin } from './plugin';
import {
  WCIIndexSourcePluginSetup,
  WCIIndexSourcePluginStart,
  WCIIndexSourcePluginStartDependencies,
} from './types';

export const plugin: PluginInitializer<
  WCIIndexSourcePluginSetup,
  WCIIndexSourcePluginStart,
  {},
  WCIIndexSourcePluginStartDependencies
> = (context: PluginInitializerContext) => {
  return new WCIIndexSourcePlugin(context);
};

export type { WCIIndexSourcePluginSetup, WCIIndexSourcePluginStart } from './types';
