/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DiscoverStart } from '@kbn/discover-plugin/public';
import type { ComponentType } from 'react';
import type { LogExplorerProps } from './components/log_explorer';

export type LogExplorerPluginSetup = void;
export interface LogExplorerPluginStart {
  LogExplorer: ComponentType<LogExplorerProps>;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface LogExplorerSetupDeps {}

export interface LogExplorerStartDeps {
  data: DataPublicPluginStart;
  discover: DiscoverStart;
}
