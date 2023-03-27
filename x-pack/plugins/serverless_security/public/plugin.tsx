/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import {
  ServerlessSecurityPluginSetup,
  ServerlessSecurityPluginStart,
  ServerlessSecurityPluginSetupDependencies,
  ServerlessSecurityPluginStartDependencies,
} from './types';
import { SecuritySideNavigation } from './components/side_navigation';
import { getKibanaServicesProvider } from './services';
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
  public setup(
    core: CoreSetup,
    setupDeps: ServerlessSecurityPluginSetupDependencies
  ): ServerlessSecurityPluginSetup {
    registerUpsellings(setupDeps.securitySolution.upselling);
    return {};
  }

  public start(
    core: CoreStart,
    startDeps: ServerlessSecurityPluginStartDependencies
  ): ServerlessSecurityPluginStart {
    const KibanaServicesProvider = getKibanaServicesProvider(core, startDeps);

    startDeps.serverless.setServerlessNavigation(
      <KibanaServicesProvider>
        <SecuritySideNavigation />
      </KibanaServicesProvider>
    );

    return {};
  }

  public stop() {}
}
