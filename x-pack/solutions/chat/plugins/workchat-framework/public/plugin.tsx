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

export class WorkChatAppPlugin
  implements
    Plugin<
      WorkChatFrameworkPluginSetup,
      WorkChatFrameworkPluginStart,
      WorkChatFrameworkPluginSetupDependencies,
      WorkChatFrameworkPluginStartDependencies
    >
{
  constructor(context: PluginInitializerContext) {}

  public setup(
    core: CoreSetup<WorkChatFrameworkPluginStartDependencies, WorkChatFrameworkPluginStart>
  ): WorkChatFrameworkPluginSetup {
    return {};
  }

  public start(
    coreStart: CoreStart,
    pluginsStart: WorkChatFrameworkPluginStartDependencies
  ): WorkChatFrameworkPluginStart {
    return {};
  }

  public stop() {}
}
