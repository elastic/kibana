/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Plugin, PluginInitializerContext, Logger, CoreSetup } from 'src/core/server';
import { VisTypeTimeseriesSetup } from 'src/plugins/vis_type_timeseries/server';
import { RollupSearchStrategy } from './search_strategies/rollup_search_strategy';

interface VisTypeTimeseriesEnhancedSetupDependencies {
  visTypeTimeseries: VisTypeTimeseriesSetup;
}

export class VisTypeTimeseriesEnhanced
  implements Plugin<void, void, VisTypeTimeseriesEnhancedSetupDependencies, any> {
  private logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get('vis_type_timeseries_enhanced');
  }

  public async setup(
    core: CoreSetup,
    { visTypeTimeseries }: VisTypeTimeseriesEnhancedSetupDependencies
  ) {
    this.logger.debug('Starting plugin');

    visTypeTimeseries.addSearchStrategy(new RollupSearchStrategy());
  }

  public start() {}
}
