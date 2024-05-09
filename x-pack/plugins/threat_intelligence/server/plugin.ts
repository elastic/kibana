/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext, Logger } from '@kbn/core/server';
import {
  CASE_ATTACHMENT_TYPE_ID,
  THREAT_INTELLIGENCE_SEARCH_STRATEGY_NAME,
} from '../common/constants';
import {
  IThreatIntelligencePlugin,
  ThreatIntelligencePluginCoreSetupDependencies,
  ThreatIntelligencePluginSetupDependencies,
} from './types';
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

    void core.getStartServices().then(([_, { data: dataStartService }]) => {
      const threatIntelligenceSearchStrategy =
        threatIntelligenceSearchStrategyProvider(dataStartService);

      plugins.data.search.registerSearchStrategy(
        THREAT_INTELLIGENCE_SEARCH_STRATEGY_NAME,
        threatIntelligenceSearchStrategy
      );

      this.logger.debug(`search strategy "${THREAT_INTELLIGENCE_SEARCH_STRATEGY_NAME}" registered`);
    });

    plugins.cases.attachmentFramework.registerExternalReference({ id: CASE_ATTACHMENT_TYPE_ID });

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
