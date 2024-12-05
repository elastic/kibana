/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { IBasePath } from '@kbn/core/server';
import { LogsSharedConfig } from '../../common/plugin_config';
import type { LogsSharedPluginStartServicesAccessor, UsageCollector } from '../types';
import type { KibanaFramework } from './adapters/framework/kibana_framework_adapter';
import type { ILogsSharedLogEntriesDomain } from './domains/log_entries_domain';

export interface LogsSharedDomainLibs {
  logEntries: ILogsSharedLogEntriesDomain;
}

export interface LogsSharedBackendLibs extends LogsSharedDomainLibs {
  basePath: IBasePath;
  config: LogsSharedConfig;
  framework: KibanaFramework;
  getStartServices: LogsSharedPluginStartServicesAccessor;
  getUsageCollector: () => UsageCollector;
  logger: Logger;
  isServerless: boolean;
}
