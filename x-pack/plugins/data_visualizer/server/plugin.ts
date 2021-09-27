/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart, Plugin } from 'src/core/server';
import { StartDeps, SetupDeps } from './types';
import { dataVisualizerRoutes } from './routes';
import { ENHANCED_ES_SEARCH_STRATEGY } from '../../../../src/plugins/data/common';
import { FIELD_STATS_SEARCH_STRATEGY } from '../common/search_strategy/constants';
import type { FieldStatsRequest, FieldStatsResponse } from '../common/search_strategy/types';
import type { ISearchStrategy } from '../../../../src/plugins/data/server';

// @todo: rename
export const myEnhancedSearchStrategyProvider = (
  data: StartDeps['data']
): ISearchStrategy<FieldStatsRequest, FieldStatsResponse> => {
  // Get the default search strategy
  const ese = data.search.getSearchStrategy(ENHANCED_ES_SEARCH_STRATEGY);
  return {
    search: (request, options, deps) => {
      // search will be called multiple times,
      // be sure your response formatting is capable of handling partial results, as well as the final result.
      return ese.search(request, options, deps);
    },
    cancel: async (id, options, deps) => {
      // call the cancel method of the async strategy you are using or implement your own cancellation function.
      if (ese.cancel) {
        await ese.cancel(id, options, deps);
      }
    },
  };
};

export class DataVisualizerPlugin implements Plugin {
  constructor() {}

  setup(coreSetup: CoreSetup<StartDeps, unknown>, plugins: SetupDeps) {
    dataVisualizerRoutes(coreSetup);
    coreSetup.getStartServices().then(([_, depsStart]) => {
      const myStrategy = myEnhancedSearchStrategyProvider(depsStart.data);
      plugins.data.search.registerSearchStrategy(FIELD_STATS_SEARCH_STRATEGY, myStrategy);
    });
  }

  start(core: CoreStart) {}
}
