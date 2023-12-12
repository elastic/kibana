/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
} from '@kbn/core/server';

import { ReplaySubject, type Subject } from 'rxjs';
import type { DataStream } from '@kbn/data-stream';
import type {
  EcsDataQualityDashboardPluginSetup,
  EcsDataQualityDashboardPluginStart,
} from './types';
import {
  getILMExplainRoute,
  getIndexMappingsRoute,
  getIndexStatsRoute,
  getUnallowedFieldValuesRoute,
  resultsRoute,
} from './routes';
import { createResultsDataStream } from './lib/data_stream/results_data_stream';

export class EcsDataQualityDashboardPlugin
  implements Plugin<EcsDataQualityDashboardPluginSetup, EcsDataQualityDashboardPluginStart>
{
  private readonly logger: Logger;
  private readonly resultsDataStream: DataStream;
  private pluginStop$: Subject<void>;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    this.pluginStop$ = new ReplaySubject(1);
    this.resultsDataStream = createResultsDataStream({
      kibanaVersion: initializerContext.env.packageInfo.version,
    });
  }

  public setup(core: CoreSetup) {
    this.logger.debug('ecsDataQualityDashboard: Setup');

    core.getStartServices().then(([{ elasticsearch }]) => {
      this.resultsDataStream.install({
        esClient: elasticsearch.client.asInternalUser,
        logger: this.logger,
        pluginStop$: this.pluginStop$,
      });
    });

    const router = core.http.createRouter();

    // Register server side APIs
    getIndexMappingsRoute(router, this.logger);
    getIndexStatsRoute(router, this.logger);
    getUnallowedFieldValuesRoute(router, this.logger);
    getILMExplainRoute(router, this.logger);
    resultsRoute(router, this.logger, this.resultsDataStream);
    return {};
  }

  public start(core: CoreStart) {
    this.logger.debug('ecsDataQualityDashboard: Started');
    return {};
  }

  public stop() {
    this.pluginStop$.next();
    this.pluginStop$.complete();
  }
}
