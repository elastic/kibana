/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext, Plugin, CoreSetup } from '@kbn/core/server';
import { ServerlessSecurityConfig } from './config';
import { getProjectSkusFeatures } from './sku/sku_features';

import {
  ServerlessSecurityPluginSetup,
  ServerlessSecurityPluginStart,
  ServerlessSecurityPluginSetupDependencies,
  ServerlessSecurityPluginStartDependencies,
} from './types';

export class ServerlessSecurityPlugin
  implements
    Plugin<
      ServerlessSecurityPluginSetup,
      ServerlessSecurityPluginStart,
      ServerlessSecurityPluginSetupDependencies,
      ServerlessSecurityPluginStartDependencies
    >
{
  constructor(private readonly initializerContext: PluginInitializerContext) {}

  public setup(_coreSetup: CoreSetup, pluginsSetup: ServerlessSecurityPluginSetupDependencies) {
    const config = this.initializerContext.config.get<ServerlessSecurityConfig>();
    pluginsSetup.securitySolution.setAppFeatures(getProjectSkusFeatures(config.projectSkus));

    return {};
  }

  public start() {
    return {};
  }

  public stop() {}
}
