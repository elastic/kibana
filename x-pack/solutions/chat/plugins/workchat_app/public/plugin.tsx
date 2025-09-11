/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Plugin, CoreStart, PluginInitializerContext } from '@kbn/core/public';
import type { Logger } from '@kbn/logging';
import type {
  WorkChatAppPluginSetup,
  WorkChatAppPluginStart,
  WorkChatAppPluginSetupDependencies,
  WorkChatAppPluginStartDependencies,
} from './types';
import { registerApp } from './application';
import { type WorkChatServices } from './services';

export class WorkChatAppPlugin
  implements
    Plugin<
      WorkChatAppPluginSetup,
      WorkChatAppPluginStart,
      WorkChatAppPluginSetupDependencies,
      WorkChatAppPluginStartDependencies
    >
{
  logger: Logger;
  private services?: WorkChatServices;

  constructor(context: PluginInitializerContext) {
    this.logger = context.logger.get();
  }

  public setup(
    core: CoreSetup<WorkChatAppPluginStartDependencies, WorkChatAppPluginStart>
  ): WorkChatAppPluginSetup {
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
    { http }: CoreStart,
    pluginsStart: WorkChatAppPluginStartDependencies
  ): WorkChatAppPluginStart {
    return {};
  }

  public stop() {}
}
