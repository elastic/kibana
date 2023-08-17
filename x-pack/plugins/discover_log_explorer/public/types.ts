/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { DiscoverStart } from '@kbn/discover-plugin/public';

export type DiscoverLogExplorerPluginSetup = void;
export type DiscoverLogExplorerPluginStart = void;

export interface DiscoverLogExplorerStartDeps {
  data: DataPublicPluginStart;
  discover: DiscoverStart;
}
