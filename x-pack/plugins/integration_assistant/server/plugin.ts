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
import { registerRoutes } from './routes';
import type {
  IntegrationAssistantPluginSetup,
  IntegrationAssistantPluginStart,
  IntegrationAssistantPluginStartDependencies,
} from './types';

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
  implements Plugin<IntegrationAssistantPluginSetup, IntegrationAssistantPluginStart>
{
  private readonly logger: Logger;
  private isAvailable: boolean;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    this.isAvailable = true;
  }

  public setup(
    core: CoreSetup<{
      actions: ActionsPluginsStart;
    }>
  ): IntegrationAssistantPluginSetup {
    core.http.registerRouteHandlerContext<
      IntegrationAssistantRouteHandlerContext,
      'integrationAssistant'
    >('integrationAssistant', () => ({
      getStartServices: core.getStartServices,
      isAvailable: () => this.isAvailable,
      logger: this.logger,
    }));
    const router = core.http.createRouter<IntegrationAssistantRouteHandlerContext>();
    this.logger.debug('integrationAssistant api: Setup');

    registerRoutes(router);

    return {
      setIsAvailable: (isAvailable: boolean) => {
        if (!isAvailable) {
          this.isAvailable = false;
        }
      },
    };
  }

  public start(
    _: CoreStart,
    dependencies: IntegrationAssistantPluginStartDependencies
  ): IntegrationAssistantPluginStart {
    this.logger.debug('integrationAssistant api: Started');
    const { licensing } = dependencies;

    licensing.license$.subscribe((license) => {
      if (!license.hasAtLeast('enterprise')) {
        this.isAvailable = false;
      }
    });

    return {};
  }

  public stop() {}
}
