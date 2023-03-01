/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import {
  ServerlessSearchPluginSetup,
  ServerlessSearchPluginSetupDependencies,
  ServerlessSearchPluginStart,
  ServerlessSearchPluginStartDependencies,
} from './types';

import { ServerlessSearchCollapsibleNavigation } from './layout/nav';

export class ServerlessSearchPlugin
  implements Plugin<ServerlessSearchPluginSetup, ServerlessSearchPluginStart>
{
  public setup(
    _core: CoreSetup,
    setupDeps: ServerlessSearchPluginSetupDependencies
  ): ServerlessSearchPluginSetup {
    setupDeps.enterpriseSearch.navigation.setIsSidebarEnabled(false);
    setupDeps.management.setIsSidebarEnabled(false);
    return {};
  }

  public start(
    core: CoreStart,
    { serverless }: ServerlessSearchPluginStartDependencies
  ): ServerlessSearchPluginStart {
    serverless.setServerlessNavigation(
      <ServerlessSearchCollapsibleNavigation
        http={core.http}
        navigateToUrl={core.application.navigateToUrl}
      />
    );
    return {};
  }

  public stop() {}
}
