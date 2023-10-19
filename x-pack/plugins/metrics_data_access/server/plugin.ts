/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, PluginInitializerContext, Plugin } from '@kbn/core/server';
import { MetricsDataPluginSetup } from './types';
import { MetricsDataClient } from './client';
import { metricsDataSourceSavedObjectType } from './saved_objects/metrics_data_source';

export class MetricsDataPlugin implements Plugin<MetricsDataPluginSetup, {}, {}, {}> {
  private metricsClient: MetricsDataClient | null = null;

  constructor(context: PluginInitializerContext) {}

  public setup(core: CoreSetup) {
    core.savedObjects.registerType(metricsDataSourceSavedObjectType);

    this.metricsClient = new MetricsDataClient();
    return {
      client: this.metricsClient,
    };
  }

  public start() {
    return {};
  }

  public stop() {}
}
