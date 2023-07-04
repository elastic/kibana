/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';

import { APP_PATH } from '@kbn/security-solution-plugin/common';
import { getSecurityGetStartedComponent } from './components/get_started';
import { getSecuritySideNavComponent } from './components/side_navigation';
import {
  SecuritySolutionServerlessPluginSetup,
  SecuritySolutionServerlessPluginStart,
  SecuritySolutionServerlessPluginSetupDeps,
  SecuritySolutionServerlessPluginStartDeps,
  ServerlessSecurityPublicConfig,
} from './types';
import { registerUpsellings } from './components/upselling';
import { createServices } from './common/services';
import { subscribeNavigationTree } from './common/navigation/navigation_tree';
import { subscribeBreadcrumbs } from './common/navigation/breadcrumbs';

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
    registerUpsellings(setupDeps.securitySolution.upselling, this.config.productTypes);
    return {};
  }

  public start(
    core: CoreStart,
    startDeps: SecuritySolutionServerlessPluginStartDeps
  ): SecuritySolutionServerlessPluginStart {
    const { securitySolution, serverless } = startDeps;
    const { productTypes } = this.config;

    const services = createServices(core, startDeps);

    securitySolution.setIsSidebarEnabled(false);
    securitySolution.setGetStartedPage(getSecurityGetStartedComponent(services, productTypes));

    serverless.setProjectHome(APP_PATH);
    serverless.setSideNavComponent(getSecuritySideNavComponent(services));

    subscribeNavigationTree(services);
    subscribeBreadcrumbs(services);

    return {};
  }

  public stop() {}
}
