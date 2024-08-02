/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, PluginInitializerContext, Plugin } from '@kbn/core/server';
import {
  MetricsDataAccessPluginSetup,
  MetricsDataAccessPluginStartDeps,
  MetricsDataAccessRouterHandlerContext,
} from './types';
import { MetricsDataAccessServices } from './services';
import { metricsDataSourceSavedObjectType } from './saved_objects/metrics_data_source';
import { KibanaFramework } from './lib/adapters/framework/kibana_framework_adapter';
import { registerRoutes } from './routes/register_routes';
import { PLUGIN_ID } from '../common';

export class MetricsDataPlugin implements Plugin<MetricsDataAccessPluginSetup, {}, {}, {}> {
  constructor(context: PluginInitializerContext) {}

  public setup(core: CoreSetup<MetricsDataAccessPluginStartDeps>) {
    const router = core.http.createRouter<MetricsDataAccessRouterHandlerContext>();
    const framework = new KibanaFramework(core, router);

    const services = new MetricsDataAccessServices();

    core.savedObjects.registerType(metricsDataSourceSavedObjectType);

    core.http.registerRouteHandlerContext<MetricsDataAccessRouterHandlerContext, typeof PLUGIN_ID>(
      PLUGIN_ID,
      async (context) => {
        const getMetricsIndices = async () => {
          const coreContext = await context.core;
          const metricsIndices = await services.getMetricIndices({
            savedObjectsClient: coreContext.savedObjects.client,
          });
          return metricsIndices;
        };

        return {
          getMetricsIndices,
        };
      }
    );

    registerRoutes({ framework, router });

    return {
      services,
    };
  }

  public start() {
    return {};
  }

  public stop() {}
}
