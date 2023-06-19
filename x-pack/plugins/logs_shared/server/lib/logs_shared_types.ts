/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { IBasePath } from '@kbn/core/server';
import type { LogsSharedPluginStartServicesAccessor, UsageCollector } from '../types';
import type { KibanaFramework } from './adapters/framework/kibana_framework_adapter';
import type { ILogsSharedLogEntriesDomain } from './domains/log_entries_domain';

export interface LogsSharedDomainLibs {
  logEntries: ILogsSharedLogEntriesDomain;
}

export interface LogsSharedBackendLibs extends LogsSharedDomainLibs {
  basePath: IBasePath;
  framework: KibanaFramework;
  getStartServices: LogsSharedPluginStartServicesAccessor;
  logger: Logger;
  getUsageCollector: () => UsageCollector;
}
