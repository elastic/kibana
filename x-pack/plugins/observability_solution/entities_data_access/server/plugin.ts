/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import { EntitiesPluginSetupDeps, EntitiesPluginStartDeps } from './types';

export type EntitiesDataAccessPluginSetup = ReturnType<EntitiesDataAccessPlugin['setup']>;
export type EntitiesDataAccessPluginStart = ReturnType<EntitiesDataAccessPlugin['start']>;

export class EntitiesDataAccessPlugin implements Plugin {
  constructor(initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup, plugins: EntitiesPluginSetupDeps) {}

  public start(core: CoreStart, plugins: EntitiesPluginStartDeps) {}
}
