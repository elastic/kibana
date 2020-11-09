/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Plugin, PluginInitializerContext, Logger, CoreSetup } from 'src/core/server';
import { ReqFacade, VisTypeTimeseriesSetup } from 'src/plugins/vis_type_timeseries/server';
import { RollupPluginSetup } from '../../rollup/server';
import { RollupSearchStrategy } from './search_strategies/rollup_search_strategy';

interface VisTypeTimeseriesEnhancedSetupDependencies {
  visTypeTimeseries: VisTypeTimeseriesSetup;
  rollup: RollupPluginSetup;
}

export class VisTypeTimeseriesEnhanced
  implements Plugin<void, void, VisTypeTimeseriesEnhancedSetupDependencies, any> {
  private logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get('vis_type_timeseries_enhanced');
  }

  public async setup(
    core: CoreSetup,
    { visTypeTimeseries, rollup }: VisTypeTimeseriesEnhancedSetupDependencies
  ) {
    this.logger.debug('Starting plugin');

    const getRollupService = async (request: ReqFacade) =>
      (await rollup.getRollupEsClient()).asScoped(request);
    const rollupSearchStrategy = new RollupSearchStrategy(getRollupService);

    visTypeTimeseries.addSearchStrategy(rollupSearchStrategy);
  }

  public start() {}
}
