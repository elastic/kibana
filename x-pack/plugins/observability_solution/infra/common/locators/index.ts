/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { InfraLogsLocator } from './logs_locator';
import type { InfraNodeLogsLocator } from './node_logs_locator';
import type { InfraClientCoreSetup } from '../../public/types';

export * from './logs_locator';
export * from './node_logs_locator';

export interface InfraLocatorDependencies {
  core: InfraClientCoreSetup;
}

export interface InfraLocators {
  logsLocator?: InfraLogsLocator;
  nodeLogsLocator?: InfraNodeLogsLocator;
}
