/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext, Logger } from '@kbn/core/server';
import { THREAT_INTELLIGENCE_SEARCH_STRATEGY_NAME } from '../common/constants';
import { registerBackgroundTask, scheduleBackgroundTask } from './matcher';
import {
  IThreatIntelligencePlugin,
  ThreatIntelligencePluginCoreSetupDependencies,
  ThreatIntelligencePluginSetupDependencies,
} from './plugin_contract';
import { threatIntelligenceSearchStrategyProvider } from './search_strategy';

export class ThreatIntelligencePlugin implements IThreatIntelligencePlugin {
  private readonly logger: Logger;

  constructor(context: PluginInitializerContext) {
    this.logger = context.logger.get();
  }

  setup(
    core: ThreatIntelligencePluginCoreSetupDependencies,
    plugins: ThreatIntelligencePluginSetupDependencies
  ) {
    this.logger.debug('setup');

    const router = core.http.createRouter();

    router.get(
      {
        path: '/api/threat_intelligence/install',
        validate: false,
      },
      async (context, request, response) => {
        return response.ok({
          body: { result: 'everything is alright' },
        });
      }
    );

    registerBackgroundTask({ core, taskManager: plugins.taskManager, logger: this.logger });

    core
      .getStartServices()
      .then(([_, { data: dataStartService, taskManager: taskManagerStart }]) => {
        const threatIntelligenceSearchStrategy =
          threatIntelligenceSearchStrategyProvider(dataStartService);

        plugins.data.search.registerSearchStrategy(
          THREAT_INTELLIGENCE_SEARCH_STRATEGY_NAME,
          threatIntelligenceSearchStrategy
        );

        this.logger.debug(
          `search strategy "${THREAT_INTELLIGENCE_SEARCH_STRATEGY_NAME}" registered`
        );

        scheduleBackgroundTask(taskManagerStart);
      });

    return {};
  }

  start() {
    this.logger.debug('start');

    return {};
  }

  stop() {
    this.logger.debug('stop');
  }
}
