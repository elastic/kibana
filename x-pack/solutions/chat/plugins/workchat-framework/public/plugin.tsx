/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Plugin, CoreStart, PluginInitializerContext } from '@kbn/core/public';
import type {
  WorkChatFrameworkPluginSetup,
  WorkChatFrameworkPluginStart,
  WorkChatFrameworkPluginSetupDependencies,
  WorkChatFrameworkPluginStartDependencies,
} from './types';
import { createServices, type InternalServices } from './services';
import { registerApp } from './application';

export class WorkChatAppPlugin
  implements
    Plugin<
      WorkChatFrameworkPluginSetup,
      WorkChatFrameworkPluginStart,
      WorkChatFrameworkPluginSetupDependencies,
      WorkChatFrameworkPluginStartDependencies
    >
{
  private services?: InternalServices;

  constructor(context: PluginInitializerContext) {}

  public setup(
    core: CoreSetup<WorkChatFrameworkPluginStartDependencies, WorkChatFrameworkPluginStart>,
    pluginDeps: WorkChatFrameworkPluginSetupDependencies
  ): WorkChatFrameworkPluginSetup {
    registerApp({
      core,
      getServices: () => {
        if (!this.services) {
          throw new Error('getServices called before plugin start');
        }
        return this.services;
      },
    });

    return {};
  }

  public start(
    core: CoreStart,
    pluginDeps: WorkChatFrameworkPluginStartDependencies
  ): WorkChatFrameworkPluginStart {
    this.services = createServices({ core });

    return {};
  }

  public stop() {}
}
