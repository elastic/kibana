/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
    _setupDeps: ServerlessSecurityPluginSetupDependencies
  ): ServerlessSecurityPluginSetup {
    return {};
  }

  public start(
    _core: CoreStart,
    { securitySolution }: ServerlessSecurityPluginStartDependencies
  ): ServerlessSecurityPluginStart {
    securitySolution.setIsSidebarEnabled(false);
    return {};
  }

  public stop() {}
}
