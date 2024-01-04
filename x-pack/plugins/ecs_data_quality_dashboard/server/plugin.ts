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
import type { DataStreamSpacesAdapter } from '@kbn/data-stream-adapter';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common/constants';
import type {
  EcsDataQualityDashboardPluginSetup,
  EcsDataQualityDashboardPluginStart,
  PluginSetupDependencies,
  DataQualityDashboardRequestHandlerContext,
} from './types';
import {
  getILMExplainRoute,
  getIndexMappingsRoute,
  getIndexStatsRoute,
  getUnallowedFieldValuesRoute,
  resultsRoutes,
} from './routes';
import { createResultsDataStream } from './lib/data_stream/results_data_stream';

export class EcsDataQualityDashboardPlugin
  implements Plugin<EcsDataQualityDashboardPluginSetup, EcsDataQualityDashboardPluginStart>
{
  private readonly logger: Logger;
  private readonly resultsDataStream: DataStreamSpacesAdapter;
  private pluginStop$: Subject<void>;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    this.pluginStop$ = new ReplaySubject(1);
    this.resultsDataStream = createResultsDataStream({
      kibanaVersion: initializerContext.env.packageInfo.version,
    });
  }

  public setup(core: CoreSetup, plugins: PluginSetupDependencies) {
    this.logger.debug('ecsDataQualityDashboard: Setup');

    core.getStartServices().then(([{ elasticsearch }]) => {
      this.resultsDataStream.install({
        esClient: elasticsearch.client.asInternalUser,
        logger: this.logger,
        pluginStop$: this.pluginStop$,
      });
    });

    core.http.registerRouteHandlerContext<
      DataQualityDashboardRequestHandlerContext,
      'dataQualityDashboard'
    >('dataQualityDashboard', (_context, request) => {
      const spaceId = plugins.spaces.spacesService.getSpaceId(request) ?? DEFAULT_SPACE_ID;
      return {
        spaceId,
        getResultsIndexName: async (): Promise<string> => {
          let indexName = await this.resultsDataStream.getSpaceIndexName(spaceId);
          if (!indexName) {
            indexName = await this.resultsDataStream.installSpace(spaceId);
          }
          return indexName;
        },
      };
    });

    const router = core.http.createRouter<DataQualityDashboardRequestHandlerContext>();

    // Register server side APIs
    getIndexMappingsRoute(router, this.logger);
    getIndexStatsRoute(router, this.logger);
    getUnallowedFieldValuesRoute(router, this.logger);
    getILMExplainRoute(router, this.logger);
    resultsRoutes(router, this.logger);
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
