/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import {
  ServerlessObservabilityPluginSetup,
  ServerlessObservabilityPluginStart,
  AppPluginSetupDependencies,
} from './types';

export class ServerlessObservabilityPlugin
  implements Plugin<ServerlessObservabilityPluginSetup, ServerlessObservabilityPluginStart>
{
  public setup(
    _core: CoreSetup,
    setupDeps: AppPluginSetupDependencies
  ): ServerlessObservabilityPluginSetup {
    setupDeps.observability.navigation.setIsSidebarEnabled(false);

    // Return methods that should be available to other plugins
    return {};
  }

  public start(_core: CoreStart): ServerlessObservabilityPluginStart {
    return {};
  }

  public stop() {}
}
