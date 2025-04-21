/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NodeType } from '@kbn/wc-framework-types-common';
import type {
  CoreStart,
  CoreSetup,
  Plugin,
  PluginInitializerContext,
  LoggerFactory,
} from '@kbn/core/server';
import { registerRoutes } from './routes';
import { registerTypes } from './saved_objects';
import { registerFeatures } from './features';
import type { InternalServices } from './services/types';
import { IntegrationRegistry } from './services/integrations';
import { createServices } from './services/create_services';
import type { WorkChatAppConfig } from './config';
import type {
  WorkChatAppPluginSetup,
  WorkChatAppPluginStart,
  WorkChatAppPluginSetupDependencies,
  WorkChatAppPluginStartDependencies,
} from './types';

export class WorkChatAppPlugin
  implements
    Plugin<
      WorkChatAppPluginSetup,
      WorkChatAppPluginStart,
      WorkChatAppPluginSetupDependencies,
      WorkChatAppPluginStartDependencies
    >
{
  private readonly logger: LoggerFactory;
  private readonly config: WorkChatAppConfig;
  private readonly integrationRegistry = new IntegrationRegistry();
  private services?: InternalServices;

  constructor(context: PluginInitializerContext) {
    this.logger = context.logger;
    this.config = context.config.get<WorkChatAppConfig>();
  }

  public setup(
    core: CoreSetup<WorkChatAppPluginStartDependencies>,
    setupDeps: WorkChatAppPluginSetupDependencies
  ): WorkChatAppPluginSetup {
    const router = core.http.createRouter();
    registerRoutes({
      core,
      router,
      logger: this.logger.get('routes'),
      getServices: () => {
        if (!this.services) {
          throw new Error('getServices called before #start');
        }
        return this.services;
      },
    });

    setupDeps.workchatFramework.workflows.register({
      id: 'my_test_workflow',
      name: 'Just a test workflow',
      type: 'graph',
      inputs: [
        {
          name: 'input',
          type: 'array',
          required: true,
        },
      ],
      steps: [
        {
          id: 'mainLoop',
          type: NodeType.loop,
          configuration: {
            inputList: 'input',
            itemVar: 'prompt',
            output: {
              source: 'output',
              destination: 'results',
            },
            steps: [
              {
                id: 'step1',
                type: NodeType.prompt,
                configuration: {
                  prompt:
                    'How much is {prompt}? Please just output the result without anything else',
                  output: 'output',
                },
              },
            ],
          },
        },
      ],
      outputs: [
        {
          name: 'results',
          ref: 'results',
        },
      ],
    });

    registerTypes({ savedObjects: core.savedObjects });

    registerFeatures({ features: setupDeps.features });

    return {
      integrations: {
        register: (integration) => {
          return this.integrationRegistry.register(integration);
        },
      },
    };
  }

  public start(
    core: CoreStart,
    pluginsDependencies: WorkChatAppPluginStartDependencies
  ): WorkChatAppPluginStart {
    this.services = createServices({
      core,
      config: this.config,
      logger: this.logger,
      pluginsDependencies,
      integrationRegistry: this.integrationRegistry,
    });

    return {};
  }
}
