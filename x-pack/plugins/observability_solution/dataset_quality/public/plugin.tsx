/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import { DatasetQualityConfig } from '../common';
import { createDatasetQuality } from './components/dataset_quality';
import { createDatasetQualityControllerLazyFactory } from './controller/lazy_create_controller';
import { DataStreamsStatsService } from './services/data_streams_stats';
import {
  DatasetQualityPluginSetup,
  DatasetQualityPluginStart,
  DatasetQualitySetupDeps,
  DatasetQualityStartDeps,
} from './types';

export class DatasetQualityPlugin
  implements Plugin<DatasetQualityPluginSetup, DatasetQualityPluginStart>
{
  constructor(private context: PluginInitializerContext) {}

  public setup(core: CoreSetup, plugins: DatasetQualitySetupDeps) {
    return {};
  }

  public start(core: CoreStart, plugins: DatasetQualityStartDeps): DatasetQualityPluginStart {
    const pluginConfig = this.context.config.get<DatasetQualityConfig>();

    const dataStreamStatsClient = new DataStreamsStatsService().start({
      http: core.http,
    }).client;

    const DatasetQuality = createDatasetQuality({
      core,
      plugins,
      dataStreamStatsClient,
      pluginConfig,
    });

    const createDatasetQualityController = createDatasetQualityControllerLazyFactory({
      core,
      dataStreamStatsClient,
    });

    return { DatasetQuality, createDatasetQualityController };
  }
}
