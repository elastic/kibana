/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Plugin,
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Logger,
  CustomRequestHandlerContext,
} from '@kbn/core/server';
import type { PluginStartContract as ActionsPluginsStart } from '@kbn/actions-plugin/server/plugin';
import { MINIMUM_LICENSE_TYPE } from '../common/constants';
import { registerRoutes } from './routes';

import type {
  IntegrationAssistantPluginSetup,
  IntegrationAssistantPluginStart,
  IntegrationAssistantPluginStartDependencies,
} from './types';
import { parseExperimentalConfigValue } from '../common/experimental_features';
import { IntegrationAssistantConfigType } from './config';
import { IntegrationAssistantPluginSetupDependencies } from '../public/types';
import { ValidateCelTask } from './graphs/cel/validation/validate_task';

export type IntegrationAssistantRouteHandlerContext = CustomRequestHandlerContext<{
  integrationAssistant: {
    getStartServices: CoreSetup<{
      actions: ActionsPluginsStart;
    }>['getStartServices'];
    isAvailable: () => boolean;
    logger: Logger;
  };
}>;

export class IntegrationAssistantPlugin
  implements
    Plugin<
      IntegrationAssistantPluginSetup,
      IntegrationAssistantPluginStart,
      IntegrationAssistantPluginSetupDependencies
    >
{
  private readonly logger: Logger;
  private readonly config: IntegrationAssistantConfigType;
  private isAvailable: boolean;
  private hasLicense: boolean;
  private validateCelTask: ValidateCelTask | undefined;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    this.config = initializerContext.config.get();
    this.isAvailable = true;
    this.hasLicense = false;
  }

  public setup(
    core: CoreSetup<{
      actions: ActionsPluginsStart;
    }>,
    dependencies: IntegrationAssistantPluginSetupDependencies
  ): IntegrationAssistantPluginSetup {
    core.http.registerRouteHandlerContext<
      IntegrationAssistantRouteHandlerContext,
      'integrationAssistant'
    >('integrationAssistant', () => ({
      getStartServices: core.getStartServices,
      isAvailable: () => this.isAvailable && this.hasLicense,
      logger: this.logger,
    }));
    const router = core.http.createRouter<IntegrationAssistantRouteHandlerContext>();
    const experimentalFeatures = parseExperimentalConfigValue(this.config.enableExperimental ?? []);
    this.validateCelTask = new ValidateCelTask({ taskManager: dependencies.taskManager });

    this.logger.info('integrationAssistant api: Setup');

    registerRoutes(router, this.validateCelTask, experimentalFeatures);
    return {
      setIsAvailable: (isAvailable: boolean) => {
        if (!isAvailable) {
          this.isAvailable = false;
        }
      },
    };
  }

  public start(
    coreStart: CoreStart,
    dependencies: IntegrationAssistantPluginStartDependencies
  ): IntegrationAssistantPluginStart {
    this.logger.info('integrationAssistant api: Started');
    const { licensing } = dependencies;

    licensing.license$.subscribe((license) => {
      this.hasLicense = license.hasAtLeast(MINIMUM_LICENSE_TYPE);
    });

    const esClient = coreStart.elasticsearch.client.asInternalUser;
    // Load the TaskManagerStartContract to the ValidateCelTask
    this.validateCelTask?.startTaskManager(dependencies.taskManager, esClient);

    return {};
  }

  public stop() {}
}
