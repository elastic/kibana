/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Plugin } from '@kbn/core/public';
import { DiscoverStart } from '@kbn/discover-plugin/public';
import { DatasetsServiceStart } from './services/datasets';

export type DiscoverLogExplorerPluginSetup = void;
export interface DiscoverLogExplorerPluginStart {
  datasetsService: DatasetsServiceStart;
}

export interface DiscoverLogExplorerStartDeps {
  discover: DiscoverStart;
}

export type DiscoverLogExplorerClientPluginClass = Plugin<
  DiscoverLogExplorerPluginSetup,
  DiscoverLogExplorerPluginStart
>;
