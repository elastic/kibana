/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DiscoverLogsLocator } from './discover_logs_locator';
import type { DiscoverNodeLogsLocator } from './discover_node_logs_locator';
import type { LogsLocator } from './logs_locator';
import type { NodeLogsLocator } from './node_logs_locator';

export * from './discover_logs_locator';
export * from './discover_node_logs_locator';
export * from './logs_locator';
export * from './node_logs_locator';

export interface InfraLocators {
  logsLocator: LogsLocator | DiscoverLogsLocator;
  nodeLogsLocator: NodeLogsLocator | DiscoverNodeLogsLocator;
}
