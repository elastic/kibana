/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, RequestHandlerContext } from '@kbn/core/server';
import {
  PluginSetup as DataPluginSetup,
  PluginStart as DataPluginStart,
} from '@kbn/data-plugin/server';
import { PluginStart as DataViewsPluginStart } from '@kbn/data-views-plugin/server';
import { LogsDataAccessPluginStart } from '@kbn/logs-data-access-plugin/server';
import { LogsSharedDomainLibs } from './lib/logs_shared_types';
import { LogViewsServiceSetup, LogViewsServiceStart } from './services/log_views/types';

export type LogsSharedPluginCoreSetup = CoreSetup<
  LogsSharedServerPluginStartDeps,
  LogsSharedPluginStart
>;
export type LogsSharedPluginStartServicesAccessor = LogsSharedPluginCoreSetup['getStartServices'];

export interface LogsSharedPluginSetup extends LogsSharedDomainLibs {
  logViews: LogViewsServiceSetup;
  registerUsageCollectorActions: (usageCollector: UsageCollector) => void;
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
  logsDataAccess: LogsDataAccessPluginStart;
}

export interface UsageCollector {
  countLogs?: () => void;
}

/**
 * @internal
 */
export type LogsSharedPluginRequestHandlerContext = RequestHandlerContext;
