/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export * from './logs_locator';
export * from './trace_logs_locator';
export * from './node_logs_locator';
export * from './get_logs_locators';

export type {
  LogsSharedLocators,
  LogsLocatorParams,
  NodeLogsLocatorParams,
  TraceLogsLocatorParams,
} from './types';
