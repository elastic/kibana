/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type CoreSetup, type Plugin, CoreStart, PluginInitializerContext } from '@kbn/core/public';
import type {
  WCIIndexSourcePluginSetup,
  WCIIndexSourcePluginStart,
  WCIIndexSourcePluginSetupDependencies,
  WCIIndexSourcePluginStartDependencies,
} from './types';
import { indexSourceIntegrationComponents } from './integration/index_source_integration';

export class WCIIndexSourcePlugin
  implements
    Plugin<
      WCIIndexSourcePluginSetup,
      WCIIndexSourcePluginStart,
      WCIIndexSourcePluginSetupDependencies,
      WCIIndexSourcePluginStartDependencies
    >
{
  constructor(context: PluginInitializerContext) {}

  public setup(
    core: CoreSetup<WCIIndexSourcePluginStartDependencies, WCIIndexSourcePluginStart>,
    { workchatApp }: WCIIndexSourcePluginSetupDependencies
  ): WCIIndexSourcePluginSetup {
    workchatApp.integrations.register(indexSourceIntegrationComponents());

    return {};
  }

  public start(
    coreStart: CoreStart,
    pluginsStart: WCIIndexSourcePluginStartDependencies
  ): WCIIndexSourcePluginStart {
    return {};
  }

  public stop() {}
}
