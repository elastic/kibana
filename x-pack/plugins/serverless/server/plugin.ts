/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from '@kbn/core/server';

import { ServerlessPluginSetup, ServerlessPluginStart } from './types';

export class ServerlessPlugin implements Plugin<ServerlessPluginSetup, ServerlessPluginStart> {
  constructor(_initializerContext: PluginInitializerContext) {}

  public setup(_core: CoreSetup) {
    return {};
  }

  public start(_core: CoreStart) {
    return {};
  }

  public stop() {}
}
