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
import { registerFeatures } from './features';
import { registerTypes } from './saved_objects';
import {
  createStartServices,
  createSetupServices,
  type InternalSetupServices,
  type InternalStartServices,
} from './services';
import { registerRoutes } from './routes';
import { registerBuiltInNodeTypes, registerBuiltInTools } from './services/runner/builtin';

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

    registerTypes({ savedObjects: core.savedObjects });

    registerFeatures({ features: setupDeps.features });

    const router = core.http.createRouter();
    registerRoutes({
      core,
      router,
      logger: this.logger.get(),
      getServices: () => this.startServices!,
    });

    registerBuiltInNodeTypes({
      registry: this.setupServices.nodeRegistry,
    });
    registerBuiltInTools({
      registry: this.setupServices.toolRegistry,
    });

    return {
      tools: {
        register: (tool) => {
          return this.setupServices!.toolRegistry.register(tool);
        },
      },
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
