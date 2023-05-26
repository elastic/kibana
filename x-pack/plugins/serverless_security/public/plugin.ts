/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import { getSecuritySideNavComponent } from './components/side_navigation';
import {
  ServerlessSecurityPluginSetup,
  ServerlessSecurityPluginStart,
  ServerlessSecurityPluginSetupDependencies,
  ServerlessSecurityPluginStartDependencies,
  ServerlessSecurityPublicConfig,
} from './types';
import { registerUpsellings } from './components/upselling';

export class ServerlessSecurityPlugin
  implements
    Plugin<
      ServerlessSecurityPluginSetup,
      ServerlessSecurityPluginStart,
      ServerlessSecurityPluginSetupDependencies,
      ServerlessSecurityPluginStartDependencies
    >
{
  private config: ServerlessSecurityPublicConfig;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.config = this.initializerContext.config.get<ServerlessSecurityPublicConfig>();
  }

  public setup(
    _core: CoreSetup,
    setupDeps: ServerlessSecurityPluginSetupDependencies
  ): ServerlessSecurityPluginSetup {
    registerUpsellings(setupDeps.securitySolution.upselling, this.config.productLineIds);
    return {};
  }

  public start(
    core: CoreStart,
    startDeps: ServerlessSecurityPluginStartDependencies
  ): ServerlessSecurityPluginStart {
    const { securitySolution, serverless } = startDeps;

    securitySolution.setIsSidebarEnabled(false);
    serverless.setSideNavComponent(getSecuritySideNavComponent(core, startDeps));

    return {};
  }

  public stop() {}
}
