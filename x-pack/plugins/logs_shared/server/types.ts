/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/server';
import {
  PluginSetup as DataPluginSetup,
  PluginStart as DataPluginStart,
} from '@kbn/data-plugin/server';
import { PluginStart as DataViewsPluginStart } from '@kbn/data-views-plugin/server';
import { LogViewsServiceSetup, LogViewsServiceStart } from './services/log_views/types';

export type { LogsSharedConfig } from '../common/plugin_config_types';

export type LogsSharedPluginCoreSetup = CoreSetup<
  LogsSharedServerPluginStartDeps,
  LogsSharedPluginStart
>;
export type LogsSharedPluginStartServicesAccessor = LogsSharedPluginCoreSetup['getStartServices'];

export interface LogsSharedPluginSetup {
  logViews: LogViewsServiceSetup;
}

export interface LogsSharedPluginStart {
  logViews: LogViewsServiceStart;
}

export interface LogsSharedServerPluginSetupDeps {
  data: DataPluginSetup;
}

export interface LogsSharedServerPluginStartDeps {
  data: DataPluginStart;
  dataViews: DataViewsPluginStart;
}
