/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
} from '../../../../src/core/server';

import { SetupPlugins, StartPlugins, TimelinesPluginUI, TimelinesPluginStart } from './types';
import { defineRoutes } from './routes';
import { timelineSearchStrategyProvider } from './search_strategy/timeline';
import { timelineEqlSearchStrategyProvider } from './search_strategy/timeline/eql';
import { indexFieldsProvider } from './search_strategy/index_fields';

export class TimelinesPlugin
  implements Plugin<TimelinesPluginUI, TimelinesPluginStart, SetupPlugins, StartPlugins> {
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup<StartPlugins, TimelinesPluginStart>, plugins: SetupPlugins) {
    this.logger.debug('timelines: Setup');
    const router = core.http.createRouter();

    // Register server side APIs
    defineRoutes(router);

    // Register search strategy
    core.getStartServices().then(([_, depsStart]) => {
      const TimelineSearchStrategy = timelineSearchStrategyProvider(depsStart.data);
      const TimelineEqlSearchStrategy = timelineEqlSearchStrategyProvider(depsStart.data);
      const IndexFields = indexFieldsProvider();

      plugins.data.search.registerSearchStrategy('indexFields', IndexFields);
      plugins.data.search.registerSearchStrategy('timelineSearchStrategy', TimelineSearchStrategy);
      plugins.data.search.registerSearchStrategy(
        'timelineEqlSearchStrategy',
        TimelineEqlSearchStrategy
      );
    });

    return {};
  }

  public start(core: CoreStart) {
    this.logger.debug('timelines: Started');
    return {};
  }

  public stop() {}
}
