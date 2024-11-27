/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';

import type {
  SearchAssistantPluginSetup,
  SearchAssistantPluginStart,
  SearchAssistantPluginStartDependencies,
} from './types';

import { registerFunctions } from './functions';

export class SearchAssistantPlugin
  implements
    Plugin<
      SearchAssistantPluginSetup,
      SearchAssistantPluginStart,
      {},
      SearchAssistantPluginStartDependencies
    >
{
  isServerless: boolean;

  constructor(context: PluginInitializerContext) {
    this.isServerless = context.env.packageInfo.buildFlavor === 'serverless';
  }

  public setup() {
    return {};
  }

  public start(coreStart: CoreStart, pluginsStart: SearchAssistantPluginStartDependencies) {
    pluginsStart.observabilityAIAssistant.service.register(registerFunctions(this.isServerless));
    return {};
  }

  public stop() {}
}
