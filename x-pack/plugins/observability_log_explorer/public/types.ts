/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogExplorerPluginStart } from '@kbn/log-explorer-plugin/public';

export type ObservabilityLogExplorerPluginSetup = void;
export type ObservabilityLogExplorerPluginStart = void;

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ObservabilityLogExplorerSetupDeps {}

export interface ObservabilityLogExplorerStartDeps {
  logExplorer: LogExplorerPluginStart;
}
