/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import { TelemetryService } from './services/telemetry';
import { createDatasetQuality } from './components/dataset_quality';
import { createDatasetQualityControllerLazyFactory } from './controller/lazy_create_controller';
import { DataStreamsStatsService } from './services/data_streams_stats';
import { DataStreamDetailsService } from './services/data_stream_details';
import {
  DatasetQualityPluginSetup,
  DatasetQualityPluginStart,
  DatasetQualitySetupDeps,
  DatasetQualityStartDeps,
} from './types';

export class DatasetQualityPlugin
  implements Plugin<DatasetQualityPluginSetup, DatasetQualityPluginStart>
{
  private telemetry = new TelemetryService();
  constructor(context: PluginInitializerContext) {}

  public setup(core: CoreSetup, plugins: DatasetQualitySetupDeps) {
    this.telemetry.setup({ analytics: core.analytics });

    return {};
  }

  public start(core: CoreStart, plugins: DatasetQualityStartDeps): DatasetQualityPluginStart {
    const telemetryClient = this.telemetry.start();

    const dataStreamStatsClient = new DataStreamsStatsService().start({
      http: core.http,
    }).client;

    const dataStreamDetailsClient = new DataStreamDetailsService().start({
      http: core.http,
    }).client;

    const DatasetQuality = createDatasetQuality({
      core,
      plugins,
      telemetryClient,
    });

    const createDatasetQualityController = createDatasetQualityControllerLazyFactory({
      core,
      dataStreamStatsClient,
      dataStreamDetailsClient,
    });

    return { DatasetQuality, createDatasetQualityController };
  }
}
