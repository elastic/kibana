/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import {
  ServerlessObservabilityPluginSetup,
  ServerlessObservabilityPluginStart,
  ServerlessObservabilityPluginSetupDependencies,
  ServerlessObservabilityPluginStartDependencies,
} from './types';

export class ServerlessObservabilityPlugin
  implements Plugin<ServerlessObservabilityPluginSetup, ServerlessObservabilityPluginStart>
{
  public setup(
    _core: CoreSetup,
    setupDeps: ServerlessObservabilityPluginSetupDependencies
  ): ServerlessObservabilityPluginSetup {
    setupDeps.observability.navigation.setIsSidebarEnabled(false);

    // Return methods that should be available to other plugins
    return {};
  }

  public start(
    _core: CoreStart,
    { serverless }: ServerlessObservabilityPluginStartDependencies
  ): ServerlessObservabilityPluginStart {
    serverless.setServerlessNavigation(<h1 style={{ color: '#fff' }}>Observability</h1>);
    return {};
  }

  public stop() {}
}
