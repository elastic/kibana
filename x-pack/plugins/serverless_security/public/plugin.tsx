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
    _core: CoreSetup,
    setupDeps: ServerlessSecurityPluginSetupDependencies
  ): ServerlessSecurityPluginSetup {
    setupDeps.securitySolution.setIsSidebarEnabled(false);
    return {};
  }

  public start(
    _core: CoreStart,
    startDeps: ServerlessSecurityPluginStartDependencies
  ): ServerlessSecurityPluginStart {
    startDeps.serverless.setServerlessNavigation(<h1 style={{ color: '#fff' }}>Security</h1>);
    return {};
  }

  public stop() {}
}
