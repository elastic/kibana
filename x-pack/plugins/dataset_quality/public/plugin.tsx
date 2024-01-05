/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import { createDatasetQuality } from './components/dataset_quality';
import { DataStreamQualityService } from './services/data_stream_quality';
import {
  DatasetQualityPluginSetup,
  DatasetQualityPluginStart,
  DatasetQualitySetupDeps,
  DatasetQualityStartDeps,
} from './types';

export class DatasetQualityPlugin
  implements Plugin<DatasetQualityPluginSetup, DatasetQualityPluginStart>
{
  dataStreamQualityService = new DataStreamQualityService();

  constructor(context: PluginInitializerContext) {}

  public setup(core: CoreSetup, plugins: DatasetQualitySetupDeps) {
    this.dataStreamQualityService.setup();

    return {};
  }

  public start(core: CoreStart, plugins: DatasetQualityStartDeps): DatasetQualityPluginStart {
    const DatasetQuality = createDatasetQuality({
      core,
      plugins,
    });

    const dataStreamQualityServiceStart = this.dataStreamQualityService.start({
      http: core.http,
    });

    return {
      DatasetQuality,
      dataStreamQualityService: dataStreamQualityServiceStart,
    };
  }
}
