/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { DataPublicPluginSetup, DataPublicPluginStart } from '@kbn/data-plugin/public';
import {
  DataViewsPublicPluginSetup,
  DataViewsPublicPluginStart,
} from '@kbn/data-views-plugin/public';
import type {
  ObservabilityPublicSetup,
  ObservabilityPublicStart,
} from '@kbn/observability-plugin/public';
import { ChartsPluginSetup, ChartsPluginStart } from '@kbn/charts-plugin/public';

export interface ProfilingPluginPublicSetupDeps {
  observability: ObservabilityPublicSetup;
  dataViews: DataViewsPublicPluginSetup;
  data: DataPublicPluginSetup;
  charts: ChartsPluginSetup;
}

export interface ProfilingPluginPublicStartDeps {
  observability: ObservabilityPublicStart;
  dataViews: DataViewsPublicPluginStart;
  data: DataPublicPluginStart;
  charts: ChartsPluginStart;
}
