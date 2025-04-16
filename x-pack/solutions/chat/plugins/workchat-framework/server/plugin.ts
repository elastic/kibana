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
import type {
  WorkChatFrameworkPluginSetup,
  WorkChatFrameworkPluginStart,
  WorkChatFrameworkPluginSetupDependencies,
  WorkChatFrameworkPluginStartDependencies,
} from './types';
import type { WorkChatFrameworkConfig } from './config';
import {
  createStartServices,
  createSetupServices,
  type InternalSetupServices,
  type InternalStartServices,
} from './framework';
import { registerBuiltInNodeTypes } from './builtin/node_types';

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

  private setupServices?: InternalSetupServices;
  private startServices?: InternalStartServices;

  constructor(context: PluginInitializerContext) {
    this.logger = context.logger;
    this.config = context.config.get<WorkChatFrameworkConfig>();
  }

  public setup(
    core: CoreSetup<WorkChatFrameworkPluginStartDependencies>,
    setupDeps: WorkChatFrameworkPluginSetupDependencies
  ): WorkChatFrameworkPluginSetup {
    this.setupServices = createSetupServices();

    registerBuiltInNodeTypes({
      registry: this.setupServices.nodeRegistry,
    });

    return {
      workflows: {
        register: (definition) => {
          return this.setupServices!.workflowRegistry.register(definition);
        },
      },
    };
  }

  public start(
    core: CoreStart,
    pluginsDependencies: WorkChatFrameworkPluginStartDependencies
  ): WorkChatFrameworkPluginStart {
    this.startServices = createStartServices({
      core,
      config: this.config,
      logger: this.logger,
      pluginsDependencies,
      setupServices: this.setupServices!,
    });

    return {
      workflows: {
        run: (args) => {
          return this.startServices!.workflowRunner.run(args);
        },
      },
    };
  }
}
