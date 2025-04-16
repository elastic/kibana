/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreStart,
  CoreSetup,
  Plugin,
  PluginInitializerContext,
  LoggerFactory,
} from '@kbn/core/server';
import type { InternalServices } from './framework/types';
import { createServices, setupServices, type SetupServices } from './framework';
import type { WorkChatFrameworkConfig } from './config';
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
  private readonly logger: LoggerFactory;
  private readonly config: WorkChatFrameworkConfig;

  private servicesSetup?: SetupServices;
  private services?: InternalServices;

  constructor(context: PluginInitializerContext) {
    this.logger = context.logger;
    this.config = context.config.get<WorkChatFrameworkConfig>();
  }

  public setup(
    core: CoreSetup<WorkChatFrameworkPluginStartDependencies>,
    setupDeps: WorkChatFrameworkPluginSetupDependencies
  ): WorkChatFrameworkPluginSetup {
    this.servicesSetup = setupServices();

    return {
      workflows: {
        register: (definition) => {
          return this.servicesSetup!.workflowRegistry.register(definition);
        },
      },
    };
  }

  public start(
    core: CoreStart,
    pluginsDependencies: WorkChatFrameworkPluginStartDependencies
  ): WorkChatFrameworkPluginStart {
    this.services = createServices({
      core,
      config: this.config,
      logger: this.logger,
      pluginsDependencies,
    });

    return {};
  }
}
