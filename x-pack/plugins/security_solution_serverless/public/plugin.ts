/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';

import { getSecurityGetStartedComponent } from './get_started';
import type {
  SecuritySolutionServerlessPluginSetup,
  SecuritySolutionServerlessPluginStart,
  SecuritySolutionServerlessPluginSetupDeps,
  SecuritySolutionServerlessPluginStartDeps,
  ServerlessSecurityPublicConfig,
} from './types';
import { registerUpsellings } from './upselling';
import { createServices } from './common/services/create_services';
import { configureNavigation } from './navigation';
import { setRoutes } from './pages/routes';
import { projectAppLinksSwitcher } from './navigation/links/app_links';

export class SecuritySolutionServerlessPlugin
  implements
    Plugin<
      SecuritySolutionServerlessPluginSetup,
      SecuritySolutionServerlessPluginStart,
      SecuritySolutionServerlessPluginSetupDeps,
      SecuritySolutionServerlessPluginStartDeps
    >
{
  private config: ServerlessSecurityPublicConfig;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.config = this.initializerContext.config.get<ServerlessSecurityPublicConfig>();
  }

  public setup(
    _core: CoreSetup,
    setupDeps: SecuritySolutionServerlessPluginSetupDeps
  ): SecuritySolutionServerlessPluginSetup {
    setupDeps.securitySolution.setAppLinksSwitcher(projectAppLinksSwitcher);

    return {};
  }

  public start(
    core: CoreStart,
    startDeps: SecuritySolutionServerlessPluginStartDeps
  ): SecuritySolutionServerlessPluginStart {
    const { securitySolution } = startDeps;
    const { productTypes } = this.config;

    const services = createServices(core, startDeps);

    registerUpsellings(securitySolution.getUpselling(), this.config.productTypes);
    securitySolution.setGetStartedPage(getSecurityGetStartedComponent(services, productTypes));

    configureNavigation(services, this.config);
    setRoutes(services);

    return {};
  }

  public stop() {}
}
