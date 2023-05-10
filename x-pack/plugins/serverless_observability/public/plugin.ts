/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { getObservabilitySideNavComponent } from './components/side_navigation';
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
    _setupDeps: ServerlessObservabilityPluginSetupDependencies
  ): ServerlessObservabilityPluginSetup {
    return {};
  }

  public start(
    _core: CoreStart,
    _setupDeps: ServerlessObservabilityPluginStartDependencies
  ): ServerlessObservabilityPluginStart {
    const { observabilityShared } = _setupDeps;
    _core.chrome.project.setSideNavComponent(getObservabilitySideNavComponent(_core));

    observabilityShared.setIsSidebarEnabled(false);
    return {};
  }

  public stop() {}
}
