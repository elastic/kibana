/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext, Plugin, CoreSetup } from '@kbn/core/server';
import { ServerlessSecurityConfig } from './config';
import { getProjectPLIsFeatures } from '../common/pli/pli_features';

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
  private config: ServerlessSecurityConfig;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.config = this.initializerContext.config.get<ServerlessSecurityConfig>();
  }

  public setup(_coreSetup: CoreSetup, pluginsSetup: ServerlessSecurityPluginSetupDependencies) {
    // essSecurity plugin should always be disabled when serverlessSecurity is enabled.
    // This check is an additional layer of security to prevent double registrations when
    // `plugins.forceEnableAllPlugins` flag is enabled).
    const shouldRegister = pluginsSetup.essSecurity == null;

    if (shouldRegister) {
      pluginsSetup.securitySolution.setAppFeatures(getProjectPLIsFeatures(this.config.projectPLIs));
    }

    return {};
  }

  public start() {
    return {};
  }

  public stop() {}
}
