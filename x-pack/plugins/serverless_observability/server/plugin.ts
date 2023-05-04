/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext, Plugin } from '@kbn/core/server';

import { ServerlessObservabilityPluginSetup, ServerlessObservabilityPluginStart } from './types';

export class ServerlessObservabilityPlugin
  implements Plugin<ServerlessObservabilityPluginSetup, ServerlessObservabilityPluginStart>
{
  constructor(_initializerContext: PluginInitializerContext) {}

  public setup() {
    return {};
  }

  public start() {
    return {};
  }

  public stop() {}
}
