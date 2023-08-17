/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { DiscoverStart } from '@kbn/discover-plugin/public';

export type LogExplorerPluginSetup = void;
export type LogExplorerPluginStart = void;

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface LogExplorerSetupDeps {}

export interface LogExplorerStartDeps {
  data: DataPublicPluginStart;
  discover: DiscoverStart;
}
