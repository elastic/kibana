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
import { SecurityPluginSetup } from '../../security/server';

export class TimelinesPlugin
  implements Plugin<TimelinesPluginUI, TimelinesPluginStart, SetupPlugins, StartPlugins>
{
  private readonly logger: Logger;
  private security?: SecurityPluginSetup;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup<StartPlugins, TimelinesPluginStart>, plugins: SetupPlugins) {
    this.logger.debug('timelines: Setup');
    this.security = plugins.security;

    const router = core.http.createRouter();

    // Register server side APIs
    defineRoutes(router);

    const IndexFields = indexFieldsProvider(core.getStartServices);
    // Register search strategy
    core.getStartServices().then(([_, depsStart]) => {
      const TimelineSearchStrategy = timelineSearchStrategyProvider(
        depsStart.data,
        depsStart.alerting,
        this.security
      );
      const TimelineEqlSearchStrategy = timelineEqlSearchStrategyProvider(depsStart.data);

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
